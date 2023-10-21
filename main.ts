import * as fs from "fs";
import { join } from "path";
import { exec } from "child_process";
import * as http from "http";
import * as https from "https";

import { v4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import WebSocket, { WebSocketServer } from "ws";
import cookie from "cookie";
import logger from "signale";

import { checkWin, chord, countNeighborMines, generateMines, matrixFrom, moveFirstMine, open } from "./minesweeper";
import { hex2rgb, rgb2hsl } from "./color";

import secrets from "./secrets.json";

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
let users = [];

function broadcast(message: any, from?: WebSocket) {
	wss.clients.forEach((ws) => {
		if (ws !== from)
			ws.send(typeof message === "string" ? message : JSON.stringify(message));
	});
}

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

let timer = 0;
let timerInterval;

function init() {
	mines = generateMines(WIDTH, HEIGHT, mineCount);
	counts = countNeighborMines(mines);
	boardState = matrixFrom(WIDTH, HEIGHT, () => -1);
	flags = matrixFrom(WIDTH, HEIGHT, () => -1);
	firstClick = true;
	failed = false;
	win = false;

	stopTimer();
	timer = 0;
	broadcast({ type: "timer", timer });
}

init();

function initTimer() {
	if (!timerInterval)
		timerInterval = setInterval(() => {
			if (timer < 999) timer++;
			broadcast({ type: "timer", timer });
		}, 1000);
}

function stopTimer() {
	clearInterval(timerInterval);
	timerInterval = undefined;
}

function fail() {
	failed = true;
	stopTimer();
	broadcast({ type: "fail", mines, boardState });
}

wss.on("connection", (ws, req) => {
	const cookies = cookie.parse(req.headers.cookie, {
		decode: (encoded: string) => {
			const string = decodeURIComponent(encoded);
			const match = string.match(/^s:(.*)\.[A-Za-z0-9+\/=]+$/);
			return match ? match[1] : string;
		}
	});

	// @ts-ignore
	const user = {
		id: v4(),
		username: cookies.username,
		color: rgb2hsl(...hex2rgb(cookies.color))
	};
	users.push(user);

	ws.send(JSON.stringify({ type: "init", id: user.id, users }));
	if (failed)
		ws.send(JSON.stringify({ flags, mines, mineCount, boardState }));
	else
		ws.send(JSON.stringify({ type: (win ? "win" : undefined), flags, mineCount, boardState }));

	ws.send(JSON.stringify({ type: "timer", timer }));

	broadcast(JSON.stringify({ type: "connect", user }), ws);

	ws.on("message", (msg) => {
		const data = JSON.parse(msg.toString());

		if (data.type === "click") {
			if (failed || win) return;

			initTimer();

			const x = data.pos[0];
			const y = data.pos[1];
			const state = boardState[y][x];

			if (state === -2)
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

			if (state === -1)
				boardState = open(boardState, counts, data.pos);
			else if (state > 0) {
				let failed;
				[boardState, failed] = chord(boardState, mines, counts, data.pos);
				if (failed)
					return fail();
			}

			win = checkWin(boardState, mines);
			if (win) stopTimer();
			return broadcast({ type: win ? "win" : undefined, boardState });
		}

		if (data.type === "flag") {
			if (failed || win) return;

			initTimer();

			const x = data.pos[0];
			const y = data.pos[1];
			const val = boardState[y][x];

			// Toggle flag
			if (val < 0) {
				const flag = val === -1;
				boardState[y][x] = flag ? -2 : -1;
				if (flag) {
					flags[y][x] = users.findIndex(u => u.id === user.id);
					broadcast({ flags, boardState });
				} else {
					broadcast({ boardState });
				}
			}
			return;
		}

		if (data.type === "reset") {
			if (failed || win) {
				init();
				broadcast({ type: "reset", mineCount, flags, boardState });
			}
			return;
		}

		data.id = user.id;
		broadcast(data, ws);
	});

	ws.on("close", () => {
		const userIndex = users.findIndex(u => u.id === user.id);
		users.splice(userIndex, 1);

		flags.forEach((row, y) => {
			row.forEach((flag, x) => {
				if (flag > userIndex)
					flags[y][x]--;
				if (flag === userIndex)
					flags[y][x] = -1;
			});
		});

		broadcast({ type: "disconnect", id: user.id, flags });
	});
});