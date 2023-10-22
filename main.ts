import * as fs from "fs";
import { join } from "path";
import { exec } from "child_process";
import * as http from "http";
import * as https from "https";

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import WebSocket, { WebSocketServer } from "ws";
import cookie from "cookie";
import logger from "signale";

import { deserializeMessage, formatMessageData, MessageType, serializeMessage } from "./lib/messages.js";

import {
	checkWin,
	chord,
	countNeighborMines,
	FLAG,
	generateMines,
	matrixFrom,
	moveFirstMine,
	open,
	WALL
} from "./minesweeper";
import { hex2rgb, rgb2hsl } from "./color";

const secrets = JSON.parse(fs.readFileSync("./secrets.json").toString());

// CONFIG
const DEV = process.env.DEV;
const PORT = process.env.PORT ?? (DEV ? "80" : "443");
const PUBLIC_ROOT = join(__dirname, "public");

const app = express();

app.use(express.static(PUBLIC_ROOT, { index: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(DEV ? undefined : secrets.cookie));

// Login check middleware
app.use((req, res, next) => {
	if (req.path === "/login") return next();

	const cookies = DEV ? req.cookies : req.signedCookies;
	if (!cookies["username"])
		res.redirect("/login?redirect=" + req.url);
	else
		next();
});

// HTTP
app.get("/", (req, res) => {
	res.sendFile(join(PUBLIC_ROOT, "index.html"));
});

app.get("/login", (req, res) => {
	res.sendFile(join(PUBLIC_ROOT, "login.html"));
});

function saveCookie(res: express.Response, key: string, value: string) {
	res.cookie(key, value, DEV ? undefined : { signed: true });
}

app.post("/login", (req, res) => {
	saveCookie(res, "username", req.body.username);
	saveCookie(res, "color", req.body.color);
	res.redirect(req.body.redirect ?? "/");
});

app.post("/webhook", (req, res) => {
	const log = logger.scope("webhook");
	exec("git status", (err, stdout) => {
		if (err) {
			log.error("Error getting repository status:", err);
		} else if (stdout.includes("Your branch is behind")) {
			exec("git reset --hard HEAD && git pull && npm install", (err) => {
				if (err) {
					log.error("Error fetching repository:", err);
				} else {
					log.success("Branch and dependencies updated");
				}
			});
		} else {
			log.info("Branch up to date");
		}

		res.sendStatus(200);
	});
});

const server = DEV
	? http.createServer(app)
	: https.createServer({
		key: fs.readFileSync("./ssl/private.key.pem"),
		cert: fs.readFileSync("./ssl/domain.cert.pem")
	}, app);

server.listen(PORT, () => {
	logger.success(`Express app listening at http${DEV ? "" : "s"}://localhost:${PORT}/`);
});

// WEBSOCKETS
const wss = new WebSocketServer({ server });
let users = {};

const WIDTH = 30;
const HEIGHT = 16;
const mineCount = 99;

let mines: boolean[][];
let counts: number[][];
let boardState: number[][];
let flags: number[][];
let firstClick: boolean;
let failed: boolean;
let win: boolean;

let time = 0;
let timerInterval;

function init() {
	mines = generateMines(WIDTH, HEIGHT, mineCount);
	counts = countNeighborMines(mines);
	boardState = matrixFrom(WIDTH, HEIGHT, () => WALL);
	flags = matrixFrom(WIDTH, HEIGHT, () => 0);
	firstClick = true;
	failed = false;
	win = false;

	stopTimer();
	time = 0;
}

init();

function broadcast(message: any, from?: WebSocket) {
	wss.clients.forEach((ws) => {
		if (ws !== from)
			ws.send(
				message instanceof Uint8Array ? message : serializeMessage(message),
				{ binary: true }
			);
	});
}

function initTimer() {
	if (!timerInterval)
		timerInterval = setInterval(() => {
			time++;
			broadcast([MessageType.TICK]);

			if (time >= 999)
				stopTimer();
		}, 1000);
}

function stopTimer() {
	clearInterval(timerInterval);
	timerInterval = undefined;
}

function fail() {
	failed = true;
	stopTimer();
	broadcast([MessageType.BOARD, boardState.flat()]);
	broadcast([MessageType.LOSE, mines.flat()]);
}

const ids = {};

const INVALID_ID = 0;

function getId() {
	for (let i = 1; i < 255; i++) {
		if (!ids[i]) {
			ids[i] = true;
			return i;
		}
	}
	return null;
}

function userMessageData(user) {
	return [MessageType.USER, user.id, ...user.color, user.username.length, user.username];
}

wss.on("connection", (ws, req) => {
	const cookies = cookie.parse(req.headers.cookie ?? "", {
		decode: (encoded: string) => {
			const string = decodeURIComponent(encoded);
			const match = string.match(/^s:(.*)\.[A-Za-z0-9+\/=]+$/);
			return match ? match[1] : string;
		}
	});

	function send(message) {
		ws.send(serializeMessage(message), { binary: true });
	}

	// @ts-ignore
	const user = {
		id: getId(),
		username: cookies.username ?? "Guest",
		color: cookies.color ? rgb2hsl(...hex2rgb(cookies.color)) : [0, 100, 50]
	};
	users[user.id] = user;

	send([MessageType.INIT, user.id, mineCount, flags.flat()]);
	Object.values(users).forEach(user => send(userMessageData(user)));
	send([MessageType.TIMER, time]);
	send([MessageType.BOARD, boardState.flat()]);

	if (failed)
		send([MessageType.LOSE, mines.flat()]);
	else if (win)
		send([MessageType.WIN]);

	broadcast(userMessageData(user), ws);

	ws.on("message", (data) => {
		const msg = formatMessageData(deserializeMessage(new Uint8Array(data as ArrayBuffer)));

		const { x, y } = msg;

		switch (msg.type) {
			case MessageType.TILE:
			case MessageType.CHORD:
				if (failed || win) return;
				initTimer();

				const state = boardState[y][x];

				if (msg.type === MessageType.TILE) {
					if (state === FLAG)
						return;

					if (firstClick) {
						mines = moveFirstMine(mines, [x, y]);
						counts = countNeighborMines(mines);
						firstClick = false;
					}

					if (mines[y][x]) {
						boardState[y][x] = 0;
						return fail();
					}
				}

				if (state === WALL && msg.type === MessageType.TILE)
					boardState = open(boardState, counts, [x, y]);
				else if (state > 0) {
					let failed;
					[boardState, failed] = chord(boardState, mines, counts, [x, y]);
					if (failed)
						return fail();
				}

				broadcast([MessageType.BOARD, boardState.flat()]);

				win = checkWin(boardState, mines);
				if (win) {
					stopTimer();
					broadcast([MessageType.WIN]);
				}
				break;

			case MessageType.FLAG:
				if (failed || win) return;

				initTimer();

				const val = boardState[y][x];

				// Toggle flag
				if (val > 8) {
					const flag = val === WALL;
					boardState[y][x] = flag ? FLAG : WALL;
					if (flag) flags[y][x] = user.id;
					broadcast([MessageType.FLAG, x, y, user.id]);
				}
				break;

			case MessageType.RESET:
				if (failed || win) {
					init();
					broadcast([MessageType.RESET, mineCount]);
				}
				break;

			default:
				broadcast(data, ws);
				break;
		}
	});

	ws.on("close", () => {
		delete users[user.id];
		delete ids[user.id];

		flags.forEach((row, y) => {
			row.forEach((flag, x) => {
				if (flag === user.id)
					flags[y][x] = INVALID_ID;
			});
		});

		broadcast([MessageType.DISCONNECT, user.id]);
	});
});