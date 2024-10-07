import WebSocket, { WebSocketServer } from "ws";
import cookie from "cookie";

import {
  deserializeMessage,
  ErrorType,
  formatMessageData,
  MessageType,
  MessageValue,
  serializeMessage,
} from "../model/messages";

import { Vector } from "../util/Vector";
import { Color } from "../util/Color";
import { Border, FLAG, GameState, WALL } from "../model/GameState";
import { server } from "./http";
import { UserConnection } from "../model/UserConnection";
import { IdGen } from "../util/IdGen";
import { Room } from "../model/Room";
import qs from "qs";
import { WebSocketQuery } from "../model/WebSocketQuery";
import bcrypt from "bcryptjs";

import * as colors from "../../public/colors.json";
import { MatrixType } from "../util/Matrix";

const wss = new WebSocketServer({ server });

export const roomId = new IdGen({ min: 1 });

export const rooms: Record<number, Room> = {
  0: new Room({
    name: "Persistent expert",
    width: 30,
    height: 16,
    mines: 99,
    type: MatrixType.HEX,
  }),
};

function broadcast(roomId: number, message: MessageValue[], from?: WebSocket) {
  wss.clients.forEach((ws) => {
    if (ws["roomId"] === roomId && ws !== from)
      ws.send(serializeMessage(message), {
        binary: true,
      });
  });
}

function fail(id: number, loserId: number) {
  rooms[id].game.timer.stop();
  rooms[id].game.loserId = loserId;
  broadcast(id, [MessageType.LOSE, loserId, rooms[id].game.mines.arr]);
}

const INVALID_ID = 0;

function userMessageData(user: UserConnection, update: boolean = false) {
  return [
    MessageType.USER,
    user.id,
    user.color.h,
    user.color.s,
    user.color.l,
    update ? 1 : 0,
    user.username,
  ];
}

function getColorId(game: GameState, color: Color, roomId: number): number {
  let id;
  if (
    !Object.values(game.colors)
      .map((c) => c.hex)
      .includes(color.hex)
  ) {
    id = game.colorIds.get();
    game.colors[id] = color;

    broadcast(roomId, [MessageType.COLOR, id, color.h, color.s, color.l]);
  } else {
    id = parseInt(
      Object.entries(game.colors).find((e) => e[1].hex == color.hex)[0],
    );
  }
  return id;
}

const FLAG_DELAY = 300;
const flagDelay = {};

wss.on("connection", (ws, req) => {
  function send(message: MessageValue[]) {
    ws.send(serializeMessage(message), { binary: true });
  }

  const query = req.url.split("?", 2)[1];
  const { id: idStr, password } = qs.parse(query) as unknown as WebSocketQuery;
  const id = parseInt(idStr);

  if (rooms[id] == null) return send([MessageType.ERROR, ErrorType.NOT_FOUND]);

  const room = rooms[id];
  ws["roomId"] = id;

  if (
    room.passwordHash &&
    (password == null || !bcrypt.compare(password, room.passwordHash))
  )
    return send([MessageType.ERROR, ErrorType.WRONG_PASS]);

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

  const names = Object.keys(colors);
  const name = names[Math.floor(Math.random() * names.length)];

  const user: UserConnection = {
    id: game.userIds.get(),
    username: cookies.username?.substring(0, 24) ?? `${name} Guest`,
    color: Color.hex(cookies.color ?? colors[name]),
  };

  send([
    MessageType.INIT,
    user.id,
    game.mineCount,
    game.timer.time,
    game.width,
    game.height,
    game.type,
    !game.firstClick,
    game.flags.arr.map(([user, color]) => (user << 5) + color),
  ]);
  // TODO Merge INIT and BOARD
  send([MessageType.BOARD, game.board.arr]);
  Object.values(game.users).forEach((user) => {
    send(userMessageData(user));
    if (user.cursorPos)
      send([MessageType.CURSOR, user.cursorPos.x, user.cursorPos.y, user.id]);
  });
  Object.entries(game.colors).forEach(([id, color]) => {
    send([MessageType.COLOR, id, color.h, color.s, color.l]);
  });

  if (game.loserId != null)
    send([MessageType.LOSE, game.loserId, game.mines.arr]);
  else if (game.win) send([MessageType.WIN]);

  game.users[user.id] = user;
  broadcast(id, userMessageData(user));

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
          broadcast(id, [MessageType.TILE, x, y]);
          return fail(id, getColorId(game, user.color, id));
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
        let failed: boolean;
        [failed, borders] = game.chord(pos);
        if (failed) {
          broadcast(id, [MessageType.CHORD, x, y]);
          return fail(id, getColorId(game, user.color, id));
        }
      }

      if (isTile) {
        broadcast(id, [MessageType.TILE, x, y, game.board.get(pos)]);
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
          broadcast(id, [MessageType.CHORD, cx, cy, tiles]);
        } else {
          const tiles = [];
          game.board.forEachNeighbor(
            pos,
            (state, p) => {
              tiles.push(state && state < 8 ? game.counts.get(p) : 0);
            },
            true,
          );
          broadcast(id, [MessageType.CHORD, x, y, tiles]);

          const tileBorders = borders.filter(
            (b) =>
              b.length === 1 &&
              (Math.abs(b[0].x - x) > 1 || Math.abs(b[0].y - y) > 1),
          );
          for (let i = 0; i < tileBorders.length; i++) {
            const { x, y } = tileBorders[i][0];
            broadcast(id, [MessageType.TILE, x, y, game.board.get(pos)]);
          }

          const holeBorders = borders.filter((b) => b.length > 1);
          for (let i = 0; i < holeBorders.length; i++) {
            broadcast(
              id,
              game.getHoleMessage(
                holeBorders[i],
                pos,
                i === holeBorders.length - 1,
              ),
            );
          }
          // Send dummy HOLE message to open borders if no previous hole message was sent
          if (holeBorders.length === 0) {
            broadcast(id, [MessageType.HOLE, x, y, x, y, true, []]);
          }
        }
      }

      game.win = game.checkWin();
      if (game.win) {
        game.timer.stop();
        broadcast(id, [MessageType.WIN]);
      }
    } else if (msg.type === MessageType.FLAG) {
      if (game.loserId != null) return;

      // Toggle flag
      const flagId = roomId + pos.toString();
      if (
        state > 8 &&
        (user.id === game.flags.get(pos)[0] || flagDelay[flagId] == null)
      ) {
        const flag = state === WALL;
        if (!flag && game.win) return;

        game.board.set(pos, flag ? FLAG : WALL);

        const color = getColorId(game, user.color, id);
        if (flag) game.flags.set(pos, [user.id, color]);
        broadcast(id, [MessageType.FLAG, x, y, user.id, color]);

        // Prevent other users toggling flag
        flagDelay[flagId] = true;
        setTimeout(() => delete flagDelay[flagId], FLAG_DELAY);
      }

      game.timer.start();
    } else if (msg.type === MessageType.RESET) {
      if (game.loserId != null || game.win) {
        game.reset();
        game.generate();
        broadcast(id, [MessageType.RESET, game.mineCount]);
      }
    } else if (msg.type === MessageType.CURSOR) {
      game.users[user.id].cursorPos = new Vector(x, y);
      broadcast(id, [MessageType.CURSOR, x, y, user.id], ws);
    } else if (msg.type === MessageType.CHAT) {
      broadcast(id, [MessageType.CHAT, user.id, msg.message]);
    } else if (msg.type === MessageType.USER) {
      user.color = Color.hsl(
        msg.hue as number,
        msg.saturation as number,
        msg.lightness as number,
      );
      user.username = msg.username as string;
      broadcast(id, userMessageData(user, true));
    }
  });

  ws.on("close", () => {
    delete game.users[user.id];
    game.userIds.delete(user.id);

    if (id !== 0 && Object.values(game.users).length === 0)
      room.timeout = setTimeout(() => delete rooms[id], Room.TIMEOUT);

    game.flags.forEachCell((flag, p) => {
      if (flag[0] === user.id) game.flags.set(p, [INVALID_ID, flag[1]]);
    });

    broadcast(id, [MessageType.DISCONNECT, user.id]);
  });
});
