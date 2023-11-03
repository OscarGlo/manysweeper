import WebSocket, { RawData, WebSocketServer } from "ws";
import cookie from "cookie";
import logger from "signale";

import {
  deserializeMessage,
  formatMessageData,
  MessageType,
  MessageValue,
  serializeMessage,
} from "../messages";

import { Vector } from "../util/Vector";
import { Color } from "../util/Color";
import { Border, FLAG, GameState, WALL } from "../model/GameState";
import { IdGen } from "../util/IdGen";
import { server } from "./http";

const wss = new WebSocketServer({ server });

const game = new GameState(30, 16, 99);

function init() {
  game.reset();
  game.generate();

  logger.debug(game);
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

function fail(id) {
  game.timer.stop();
  game.loserId = id;
  broadcast([MessageType.LOSE, id, game.mines.arr]);
}

const INVALID_ID = 0;

const userIds = new IdGen({ min: 1, max: 255 });

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
    id: userIds.get(),
    username: cookies.username ?? "Guest",
    color: cookies.color ? Color.hex(cookies.color) : Color.RED,
  };

  send([
    MessageType.INIT,
    user.id,
    game.mineCount,
    game.timer.time,
    game.width,
    game.height,
    !game.firstClick,
    game.flags.arr,
  ]);
  // TODO Merge INIT and BOARD
  send([MessageType.BOARD, game.board.arr]);
  Object.values(game.users).forEach((user) => send(userMessageData(user)));

  if (game.loserId != null)
    send([MessageType.LOSE, game.loserId, game.mines.arr]);
  else if (game.win) send([MessageType.WIN]);

  game.users[user.id] = user;
  broadcast(userMessageData(user));

  ws.on("message", (data) => {
    const msg = formatMessageData(
      deserializeMessage(new Uint8Array(data as ArrayBuffer)),
    );

    const { x, y } = msg as { x: number; y: number };
    const pos = new Vector(x, y);
    const state = game.board.get(pos);

    if (msg.type === MessageType.TILE || msg.type === MessageType.CHORD) {
      if (game.loserId || game.win) {
        return;
      }
      game.timer.start();

      if (state === 0 || state === FLAG) {
        return;
      }

      if (msg.type === MessageType.TILE) {
        if (game.firstClick) game.moveFirstMine(pos);

        if (game.mines.get(pos)) {
          game.board.set(pos, 0);
          broadcast([MessageType.TILE, x, y]);
          return fail(user.id);
        }
      }

      const isTile = state === WALL && game.counts.get(pos) !== 0;
      let borders: Border[] = [];

      if (state === WALL && msg.type === MessageType.TILE) {
        if (isTile) {
          game.board.set(pos, game.counts.get(pos));
        } else {
          borders = game.open(pos);
        }
      } else {
        let failed;
        [failed, borders] = game.chord(pos);
        if (failed) {
          broadcast([MessageType.CHORD, x, y]);
          return fail(user.id);
        }
      }

      if (isTile) {
        broadcast([MessageType.TILE, x, y, game.board.get(pos)]);
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
          (dx === 2 || (dx === 1 && (minX === 0 || maxX === game.width - 1))) &&
          (dy === 2 || (dy === 1 && (minY === 0 || maxY === game.width - 1)))
        ) {
          const cx = dx === 2 ? minX + 1 : minX === 0 ? minX : maxX;
          const cy = dy === 2 ? minY + 1 : minY === 0 ? minY : maxY;
          const tiles = [];
          game.board.forEachNeighbor(
            pos,
            (state, p) => {
              tiles.push(state != null && state < 8 ? game.counts.get(p) : 0);
            },
            true,
          );
          broadcast([MessageType.CHORD, cx, cy, tiles]);
        } else {
          const tiles = [];
          game.board.forEachNeighbor(
            pos,
            (state, p) => {
              tiles.push(state && state < 8 ? game.counts.get(p) : 0);
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
            broadcast([MessageType.TILE, x, y, game.board.get(pos)]);
          }

          const holeBorders = borders.filter((b) => b.length > 1);
          logger.debug(holeBorders);
          for (let i = 0; i < holeBorders.length; i++) {
            broadcast(
              game.getHoleMessage(
                holeBorders[i],
                pos,
                i === holeBorders.length - 1,
              ),
            );
          }
          // Send dummy HOLE message to open borders if no previous hole message was sent
          if (holeBorders.length === 0) {
            broadcast([MessageType.HOLE, x, y, x, y, true, []]);
          }
        }
      }

      game.win = game.checkWin();
      if (game.win) {
        game.timer.stop();
        broadcast([MessageType.WIN]);
      }
    } else if (msg.type === MessageType.FLAG) {
      if (game.loserId || game.win) return;

      game.timer.start();

      // Toggle flag
      if (state > 8) {
        const flag = state === WALL;
        game.board.set(pos, flag ? FLAG : WALL);
        if (flag) game.flags.set(pos, user.id);
        broadcast([MessageType.FLAG, x, y, user.id]);
      }
    } else if (msg.type === MessageType.RESET) {
      if (game.loserId || game.win) {
        init();
        broadcast([MessageType.RESET, game.mineCount]);
      }
    } else if (msg.type === MessageType.CURSOR) {
      broadcast(data, ws);
    }
  });

  ws.on("close", () => {
    delete game.users[user.id];
    userIds.delete(user.id);

    if (game.loserId === user.id) game.loserId = 0;

    game.flags.forEachCell((id, p) => {
      if (id === user.id) game.flags.set(p, INVALID_ID);
    });

    broadcast([MessageType.DISCONNECT, user.id]);
  });
});
