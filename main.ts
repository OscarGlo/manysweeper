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

import { checkWin, chord, countNeighborMines, generateMines, matrixFrom, moveFirstMine, open } from "./minesweeper";
import logger from "signale";

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

app.post("/login", (req, res) => {
   res.cookie("username", req.body.username, DEV ? undefined : { signed: true });
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
const users = {};

function broadcast(message: any, from?: WebSocket) {
   wss.clients.forEach((ws) => {
      if (ws !== from)
         ws.send(typeof message === "string" ? message : JSON.stringify(message));
   });
}

const WIDTH = 25;
const HEIGHT = 15;
const MINES = 65;

let mines: boolean[][];
let counts: number[][];
let boardState: number[][];
let firstClick: boolean;
let failed: boolean;
let win: boolean;

function init() {
   mines = generateMines(WIDTH, HEIGHT, MINES);
   counts = countNeighborMines(mines);
   boardState = matrixFrom(WIDTH, HEIGHT, () => -1);
   firstClick = true;
   failed = false;
   win = false;
}

init();

wss.on("connection", (ws, req) => {
   const cookies = cookie.parse(req.headers.cookie, { decode: (encoded: string) => {
      const string = decodeURIComponent(encoded);
      const match = string.match(/^s:(.*)\.[A-Za-z0-9+\/=]+$/);
      return match ? match[1] : string;
   }});
   
   const user = {
      id: v4(),
      username: cookies.username,
   }
   users[user.id] = user;
   
   ws.send(JSON.stringify({ type: "init", id: user.id, users }));
   if (failed)
      ws.send(JSON.stringify({ type: "fail", mines, boardState }));
   else
      ws.send(JSON.stringify({ type: (win ? "win" : "board"), boardState }));
   
   broadcast(JSON.stringify({ type: "connect", ...user }), ws);
   
   ws.on("message", (msg) => {
      const data = JSON.parse(msg.toString());
      
      if (data.type === "click") {
         if (failed || win) return;
         
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
            failed = true;
            boardState[y][x] = 0;
            return broadcast({ type: "fail", mines, boardState });
         }
         
         if (state === -1)
            boardState = open(boardState, counts, data.pos);
         else if (state > 0) {
            let fail;
            [boardState, fail] = chord(boardState, mines, counts, data.pos);
            if (fail) {
               failed = true;
               return broadcast({ type: "fail", mines });
            }
         }
         
         win = checkWin(boardState, mines);
         return broadcast({ type: win ? "win" : "board", boardState });
      }
      
      if (data.type === "flag") {
         if (failed || win) return;
         
         const x = data.pos[0];
         const y = data.pos[1];
         const val = boardState[y][x];
         
         // Toggle flag
         if (val < 0) {
            boardState[y][x] = val === -1 ? -2 : -1;
            
            win = checkWin(boardState, mines);
            broadcast({ type: win ? "win" : "board", boardState });
         }
         return;
      }
      
      if (data.type === "reset") {
         if (failed || win) {
            init();
            broadcast({ type: "reset", boardState });
         }
         return;
      }
      
      data.id = user.id;
      broadcast(data, ws);
   });
   
   ws.on("close", () => broadcast({ type: "disconnect", id: user.id }));
});