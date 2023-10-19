import { join } from "path";

import { v4 } from "uuid";

import express from "express";
import expressWs from "express-ws";
import WebSocket from "ws";
import { chord, countNeighborMines, generateMines, matrixFrom, open } from "./minesweeper";

// CONFIG
const PORT = process.env.PORT || "80";
const PUBLIC_ROOT = join(__dirname, "public");

const wrapper = expressWs(express());
const app = wrapper.app;
const wss = wrapper.getWss();

// HTTP
app.use(express.static(PUBLIC_ROOT, { index: false }));

app.get("/", (req, res) => {
   res.sendFile(join(PUBLIC_ROOT, "index.html"));
});

app.listen(PORT, () => {
   console.log(`Express app listening on ${PORT}`);
});

// WEBSOCKETS
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


app.ws("/", ws => {
   const id = v4();
   ws.send(JSON.stringify({ type: "init", id }));
   ws.send(JSON.stringify({ type: "board", boardState }));
   if (failed)
      ws.send(JSON.stringify({ type: "fail", mines }));
   
   ws.on("message", (msg) => {
      const data = JSON.parse(msg.toString());
      data.id = id;
      
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
         init();
         broadcast({ type: "reset", boardState });
      }
      
      broadcast(data, ws);
   });
   
   ws.on("close", () => broadcast({ type: "disconnect", id }));
});