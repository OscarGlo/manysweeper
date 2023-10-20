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

import { chord, countNeighborMines, generateMines, matrixFrom, open } from "./minesweeper";
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

function broadcast(message: any, from?: WebSocket) {
   wss.clients.forEach((ws) => {
      if (ws !== from)
         ws.send(typeof message === "string" ? message : JSON.stringify(message));
   });
}

const WIDTH = 25;
const HEIGHT = 15;

let mines: boolean[][];
let counts: number[][];
let boardState: number[][];
let failed: boolean;

function init() {
   mines = generateMines(WIDTH, HEIGHT, 70);
   counts = countNeighborMines(mines);
   boardState = matrixFrom(WIDTH, HEIGHT, () => -1);
   failed = false;
}

init();

const users = {};

wss.on("connection", (ws, req) => {
   const cookies = cookie.parse(req.headers.cookie, { decode: (s: string) => {
      const match = s.match(/^s:(.*)\.\w+$/);
      return decodeURIComponent(match ? match[1] : s);
   }});
   
   const user = {
      id: v4(),
      username: cookies.username,
   }
   users[user.id] = user;
   
   ws.send(JSON.stringify({ type: "init", id: user.id, users }));
   ws.send(JSON.stringify({ type: "board", boardState }));
   if (failed)
      ws.send(JSON.stringify({ type: "fail", mines }));
   
   broadcast(JSON.stringify({ type: "connect", ...user }), ws);
   
   ws.on("message", (msg) => {
      const data = JSON.parse(msg.toString());
      
      if (data.type === "click") {
         if (failed) return;
         
         const x = data.pos[0];
         const y = data.pos[1];
         const state = boardState[y][x];
         
         if (state === -2)
            return;
         
         if (mines[y][x]) {
            failed = true;
            return broadcast({ type: "fail", mines });
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
         
         return broadcast({ type: "board", boardState });
      }
      
      if (data.type === "flag") {
         if (failed) return;
         
         const x = data.pos[0];
         const y = data.pos[1];
         const val = boardState[y][x];
         
         // Toggle flag
         if (val < 0) {
            boardState[y][x] = val === -1 ? -2 : -1;
            broadcast({ type: "board", boardState });
         }
         return;
      }
      
      if (data.type === "reset") {
         if (failed) {
            init();
            return broadcast({ type: "reset", boardState });
         }
      }
      
      data.id = user.id;
      broadcast(data, ws);
   });
   
   ws.on("close", () => broadcast({ type: "disconnect", id: user.id }));
});