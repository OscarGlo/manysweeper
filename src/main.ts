import * as fs from "fs";
import { join } from "path";
import { exec } from "child_process";
import * as http from "http";
import * as https from "https";

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import WebSocket, { RawData, WebSocketServer } from "ws";
import cookie from "cookie";
import logger from "signale";

import {
  deserializeMessage,
  formatMessageData,
  MessageType,
  MessageValue,
  serializeMessage,
} from "./messages";
import { getHoleMessage } from "./hole";

import {
  Border,
  checkWin,
  chord,
  countNeighborMines,
  FLAG,
  generateMines,
  moveFirstMine,
  open,
  WALL,
} from "./minesweeper";
import { Matrix } from "./util/Matrix";
import { Vector } from "./util/Vector";
import { Color } from "./util/Color";

const secrets = JSON.parse(fs.readFileSync("./secrets.json").toString());

// CONFIG
const DEV = process.env.DEV;
const PORT = process.env.PORT ?? (DEV ? "80" : "443");
const PUBLIC_ROOT = join(__dirname, "..", "public");

const app = express();

app.use(express.static(PUBLIC_ROOT, { index: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(DEV ? undefined : secrets.cookie));

// Login check middleware
app.use((req, res, next) => {
  if (req.path === "/login") return next();

  const cookies = DEV ? req.cookies : req.signedCookies;
  if (!cookies["username"]) res.redirect("/login?redirect=" + req.url);
  else next();
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
  : https.createServer(
      {
        key: fs.readFileSync("./ssl/private.key.pem"),
        cert: fs.readFileSync("./ssl/domain.cert.pem"),
      },
      app,
    );

server.listen(PORT, () => {
  logger.success(
    `Express app listening at http${DEV ? "" : "s"}://localhost:${PORT}/`,
  );
});

// WEBSOCKETS
const wss = new WebSocketServer({ server });
const users = {};

const WIDTH = 30;
const HEIGHT = 16;
const mineCount = 99;

let mines: Matrix<boolean>;
let counts: Matrix<number>;
let boardState: Matrix<number>;
let flags: Matrix<number>;
let firstClick: boolean;
let failed: boolean;
let win: boolean;
let loserId: number;

let time = 0;
let timerInterval;

function init() {
  mines = generateMines(WIDTH, HEIGHT, mineCount);
  logger.debug(mines);
  counts = countNeighborMines(mines);
  logger.debug(counts);
  boardState = new Matrix(WIDTH, HEIGHT, WALL);
  flags = new Matrix(WIDTH, HEIGHT, 0);
  firstClick = true;
  failed = false;
  win = false;
  loserId = undefined;

  stopTimer();
  time = 0;
}

init();

function broadcast(message: MessageValue[] | RawData, from?: WebSocket) {
  wss.clients.forEach((ws) => {
    if (ws !== from)
      ws.send(
        Array.isArray(message)
          ? serializeMessage(message as MessageValue[])
          : message,
        {
          binary: true,
        },
      );
  });
}

function initTimer() {
  if (!timerInterval)
    timerInterval = setInterval(() => {
      time++;
      if (time >= 999) stopTimer();
    }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = undefined;
}

function fail(id) {
  failed = true;
  stopTimer();
  loserId = id;
  broadcast([MessageType.LOSE, id, mines.arr]);
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
  return [
    MessageType.USER,
    user.id,
    user.color.h,
    user.color.s,
    user.color.l,
    user.username,
  ];
}

wss.on("connection", (ws, req) => {
  const cookies = cookie.parse(req.headers.cookie ?? "", {
    decode: (encoded: string) => {
      const string = decodeURIComponent(encoded);
      const match = string.match(/^s:(.*)\.[A-Za-z0-9+/=]+$/);
      return match ? match[1] : string;
    },
  });

  function send(message) {
    ws.send(serializeMessage(message), { binary: true });
  }

  const user = {
    id: getId(),
    username: cookies.username ?? "Guest",
    color: cookies.color ? Color.hex(cookies.color) : Color.RED,
  };
  users[user.id] = user;

  send([MessageType.INIT, user.id, mineCount, time, WIDTH, HEIGHT, flags.arr]);
  Object.values(users).forEach((user) => send(userMessageData(user)));
  // TODO Merge INIT and BOARD
  send([MessageType.BOARD, counts.arr]);

  if (failed) send([MessageType.LOSE, loserId, mines.arr]);
  else if (win) send([MessageType.WIN]);

  broadcast(userMessageData(user), ws);

  ws.on("message", (data) => {
    const msg = formatMessageData(
      deserializeMessage(new Uint8Array(data as ArrayBuffer)),
    );

    logger.debug(msg);

    const { x, y } = msg as { x: number; y: number };
    const pos = new Vector(x, y);
    const state = boardState.get(pos);

    if (msg.type === MessageType.TILE || msg.type === MessageType.CHORD) {
      if (failed || win) {
        return;
      }
      initTimer();

      if (state === 0 || state === FLAG) {
        return;
      }

      if (msg.type === MessageType.TILE) {
        if (firstClick) {
          mines = moveFirstMine(mines, pos);
          counts = countNeighborMines(mines);
          firstClick = false;
        }

        if (mines.get(pos)) {
          boardState.set(pos, 0);
          broadcast([MessageType.TILE, x, y]);
          return fail(user.id);
        }
      }

      const isTile = state === WALL && counts.get(pos) !== 0;
      let borders: Border[] = [];

      if (state === WALL && msg.type === MessageType.TILE) {
        if (isTile) {
          boardState.set(pos, counts.get(pos));
        } else {
          [boardState, borders] = open(boardState, counts, pos);
        }
      } else {
        let failed;
        [boardState, failed, borders] = chord(boardState, mines, counts, pos);
        if (failed) {
          broadcast([MessageType.CHORD, x, y]);
          return fail(user.id);
        }
      }

      if (isTile) {
        broadcast([MessageType.TILE, x, y, boardState.get(pos)]);
      } else {
        if (borders.length === 0) return;

        let minX = x as number,
          minY = y as number,
          maxX = x as number,
          maxY = y as number;
        for (const pos of borders.flat()) {
          if (pos.x < minX) minX = x;
          if (pos.x > maxX) maxX = x;
          if (pos.y < minY) minY = y;
          if (pos.y > maxY) maxY = y;
        }
        const dx = maxX - minX;
        const dy = maxY - minY;
        if (
          (dx === 2 || (dx === 1 && (minX === 0 || maxX === WIDTH - 1))) &&
          (dy === 2 || (dy === 1 && (minY === 0 || maxY === HEIGHT - 1)))
        ) {
          const cx = dx === 2 ? minX + 1 : minX === 0 ? minX : maxX;
          const cy = dy === 2 ? minY + 1 : minY === 0 ? minY : maxY;
          const tiles = [];
          boardState.forEachNeighbor(
            pos,
            (state, p) => {
              tiles.push(state != null && state < 8 ? counts.get(p) : 0);
            },
            true,
          );
          broadcast([MessageType.CHORD, cx, cy, tiles]);
        } else {
          const tiles = [];
          boardState.forEachNeighbor(
            pos,
            (state, p) => {
              tiles.push(state && state < 8 ? counts.get(p) : 0);
            },
            true,
          );
          broadcast([MessageType.CHORD, x, y, tiles]);

          const tileBorders = borders.filter(
            (b) =>
              b.length === 1 &&
              (Math.abs(b[0].x - x) > 1 || Math.abs(b[0].y - y) > 1),
          );
          for (let i = 0; i < tileBorders.length; i++) {
            const { x, y } = tileBorders[i][0];
            broadcast([MessageType.TILE, x, y, boardState.get(pos)]);
          }

          const holeBorders = borders.filter((b) => b.length > 1);
          for (let i = 0; i < holeBorders.length; i++) {
            broadcast(
              getHoleMessage(
                holeBorders[i],
                counts,
                pos,
                i === holeBorders.length - 1,
              ),
            );
          }
          if (holeBorders.length === 0) {
            broadcast([MessageType.HOLE, x, y, x, y, true, []]);
          }
        }
      }

      win = checkWin(boardState, mines);
      if (win) {
        {
          stopTimer();
          broadcast([MessageType.WIN]);
        }
      }
    } else if (msg.type === MessageType.FLAG) {
      if (failed || win) return;

      initTimer();

      // Toggle flag
      if (state > 8) {
        const flag = state === WALL;
        boardState.set(pos, flag ? FLAG : WALL);
        if (flag) flags.set(pos, user.id);
        broadcast([MessageType.FLAG, x, y, user.id]);
      }
    } else if (msg.type === MessageType.RESET) {
      if (failed || win) {
        init();
        broadcast([MessageType.RESET, mineCount]);
      }
    } else if (msg.type === MessageType.CURSOR) {
      broadcast(data, ws);
    }
  });

  ws.on("close", () => {
    delete users[user.id];
    delete ids[user.id];

    if (loserId === user.id) loserId = 0;

    flags.forEachCell((id, p) => {
      if (id === user.id) flags.set(p, INVALID_ID);
    });

    broadcast([MessageType.DISCONNECT, user.id]);
  });
});
