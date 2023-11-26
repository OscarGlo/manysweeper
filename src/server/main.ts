import WebSocket, { WebSocketServer } from "ws";
import cookie from "cookie";

import {
  deserializeMessage,
  formatMessageData,
  MessageType,
  MessageValue,
  serializeMessage,
} from "../model/messages";

import { Vector } from "../util/Vector";
import { Color } from "../util/Color";
import { Border, FLAG, WALL } from "../model/GameState";
import { server } from "./http";
import { UserConnection } from "../model/UserConnection";
import { IdGen } from "../util/IdGen";
import { Room } from "../model/Room";

const wss = new WebSocketServer({ server });

export const roomId = new IdGen({ min: 1 });

export const rooms: Record<number, Room> = {
  0: new Room({ name: "Persistent expert", width: 30, height: 16, mines: 99 }),
};

function broadcast(message: MessageValue[], from?: WebSocket) {
  wss.clients.forEach((ws) => {
    if (ws !== from)
      ws.send(serializeMessage(message as MessageValue[]), {
        binary: true,
      });
  });
}

function fail(id: number, loserId: number) {
  rooms[id].game.timer.stop();
  rooms[id].game.loserId = loserId;
  broadcast([MessageType.LOSE, loserId, rooms[id].game.mines.arr]);
}

const INVALID_ID = 0;

function userMessageData(user: UserConnection) {
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
  function send(message) {
    ws.send(serializeMessage(message), { binary: true });
  }

  const id = parseInt(req.url.split("?", 2)[1]);

  if (rooms[id] == null) return send([MessageType.ERROR]);

  const room = rooms[id];

  clearTimeout(room.timeout);
  room.timeout = undefined;

  const game = room.game;

  const cookies = cookie.parse(req.headers.cookie ?? "", {
    decode: (encoded: string) => {
      const string = decodeURIComponent(encoded);
      const match = string.match(/^s:(.*)\.[A-Za-z0-9+/=]+$/);
      return match ? match[1] : string;
    },
  });

  const user: UserConnection = {
    id: game.userIds.get(),
    username: cookies.username?.substring(0, 24) ?? "Guest",
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
      if (game.loserId != null || game.win) {
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
          return fail(id, user.id);
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
          return fail(id, user.id);
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
      if (game.loserId != null || game.win) return;

      game.timer.start();

      // Toggle flag
      if (state > 8) {
        const flag = state === WALL;
        game.board.set(pos, flag ? FLAG : WALL);
        if (flag) game.flags.set(pos, user.id);
        broadcast([MessageType.FLAG, x, y, user.id]);
      }
    } else if (msg.type === MessageType.RESET) {
      if (game.loserId != null || game.win) {
        game.reset();
        game.generate();
        broadcast([MessageType.RESET, game.mineCount]);
      }
    } else if (msg.type === MessageType.CURSOR) {
      broadcast([MessageType.CURSOR, x, y, user.id], ws);
    }
  });

  ws.on("close", () => {
    delete game.users[user.id];
    game.userIds.delete(user.id);

    if (id !== 0 && Object.values(game.users).length === 0)
      room.timeout = setTimeout(() => delete rooms[id], Room.TIMEOUT);

    if (game.loserId === user.id) game.loserId = INVALID_ID;

    game.flags.forEachCell((id, p) => {
      if (id === user.id) game.flags.set(p, INVALID_ID);
    });

    broadcast([MessageType.DISCONNECT, user.id]);
  });
});
