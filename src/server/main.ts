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
import {
  Border,
  FLAG,
  Gamemode,
  GameState,
  GuessLevel,
  WALL,
} from "../model/GameState";
import { server } from "./http";
import { UserConnection } from "../model/UserConnection";
import { IdGen } from "../util/IdGen";
import { Room } from "../model/Room";
import qs from "qs";
import { WebSocketQuery } from "../model/WebSocketQuery";
import bcrypt from "bcryptjs";

import * as colors from "../../public/colors.json";
import { MatrixType } from "../util/Matrix";
import { generateBoard } from "./generate/generateBoard";

const wss = new WebSocketServer({ server });

function broadcast(roomId: number, message: MessageValue[], from?: WebSocket) {
  wss.clients.forEach((ws) => {
    if (ws["roomId"] === roomId && ws !== from)
      ws.send(serializeMessage(message), {
        binary: true,
      });
  });
}

function reset(id: number) {
  const game = rooms[id].game;
  broadcast(id, [
    MessageType.RESET,
    game.mineCount,
    game.startPos != null,
    game.startPos?.x ?? 0,
    game.startPos?.y ?? 0,
  ]);
}

function generateBroadcast(id: number) {
  const game = rooms[id].game;
  generateBoard(game).then(() => reset(id));
}

export const rooms: Record<number, Room> = {
  0: new Room({
    name: "Persistent expert (Random)",
    width: 30,
    height: 16,
    mines: 99,
    type: MatrixType.SQUARE,
    guessLevel: GuessLevel.None,
    // TODO: Change back
    gamemode: Gamemode.FLAGS,
  }),
  1: new Room({
    name: "Persistent expert (NG)",
    width: 30,
    height: 16,
    mines: 99,
    type: MatrixType.SQUARE,
    guessLevel: GuessLevel.Hard,
    gamemode: Gamemode.COOP,
  }),
};

const persistentIds = Object.keys(rooms).map((s) => parseInt(s));
persistentIds.map((i) => generateBroadcast(i));

export const roomId = new IdGen({ min: Math.max(...persistentIds) + 1 });

function fail(id: number, loserId: number) {
  rooms[id].game.timer.stop();
  rooms[id].game.loserId = loserId;
  broadcast(id, [MessageType.END, loserId, rooms[id].game.mines.arr]);
}

const INVALID_ID = 0;

function userMessageData(user: UserConnection, update: boolean = false) {
  return [
    MessageType.USER,
    user.id,
    user.score,
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
    score: 0,
  };

  game.users[user.id] = user;
  broadcast(id, userMessageData(user), ws);

  Object.values(game.users).forEach((user) => {
    send(userMessageData(user));
    if (user.cursorPos)
      send([MessageType.CURSOR, user.cursorPos.x, user.cursorPos.y, user.id]);
  });
  send([
    MessageType.INIT,
    user.id,
    game.mineCount,
    game.timer.time,
    game.width,
    game.height,
    game.type,
    game.guessLevel,
    game.gamemode,
    game.startPos != null,
    game.startPos?.x ?? 0,
    game.startPos?.y ?? 0,
    !game.firstClick,
    game.flags.arr.map(([user, color]) => (user << 5) + color),
  ]);
  // TODO Merge INIT and BOARD
  send([MessageType.BOARD, game.board.arr]);
  Object.entries(game.colors).forEach(([id, color]) => {
    send([MessageType.COLOR, id, color.h, color.s, color.l]);
  });

  if (game.loserId != null)
    send([MessageType.END, game.loserId, game.mines.arr]);
  else if (game.win) send([MessageType.END]);

  if (game.loading) send([MessageType.LOADING]);

  room.on("generated", () => reset(id));

  ws.on("message", (data) => {
    const msg = formatMessageData(
      deserializeMessage(new Uint8Array(data as ArrayBuffer)),
    );

    const { x, y } = msg as { x: number; y: number };
    const pos = new Vector(x, y);
    const state = game.board.get(pos);

    if (msg.type === MessageType.TILE || msg.type === MessageType.CHORD) {
      if (
        !game.firstClick &&
        game.gamemode === Gamemode.FLAGS &&
        user.id !== game.roundPlayers[game.currentPlayer]
      )
        return;

      if (game.loserId != null || game.win) {
        return;
      }
      game.timer.start();

      if (
        (game.gamemode === Gamemode.FLAGS && state !== WALL) ||
        state === 0 ||
        state === FLAG
      ) {
        return;
      }

      if (msg.type === MessageType.TILE) {
        if (game.firstClick) {
          if (game.gamemode !== Gamemode.FLAGS) {
            game.moveFirstMine(pos);
          }
          game.firstClick = false;
          if (game.gamemode === Gamemode.FLAGS) {
            game.roundPlayers = Object.keys(game.users).map((id) =>
              parseInt(id),
            );
            game.currentPlayer = game.roundPlayers.indexOf(user.id);
            broadcast(id, [
              MessageType.PLAYER,
              game.roundPlayers[game.currentPlayer],
            ]);
          }
        }

        if (game.mines.get(pos)) {
          if (game.gamemode === Gamemode.FLAGS) {
            game.board.set(pos, FLAG);
            user.score++;
            broadcast(id, [
              MessageType.FLAG,
              x,
              y,
              user.id,
              getColorId(game, user.color, id),
            ]);

            if (user.score > game.mineCount / 2) {
              wss.clients.forEach((w) => {
                if (w["roomId"] === id)
                  w.send(
                    serializeMessage([
                      MessageType.END,
                      w === ws ? 0 : user.id,
                      game.mines.arr,
                    ]),
                  );
              });
              game.win = true;
            }
          } else {
            game.board.set(pos, 0);
            broadcast(id, [MessageType.TILE, x, y]);
            fail(id, getColorId(game, user.color, id));
          }
          return;
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

        const tiles = [];
        game.board.forEachNeighbor(
          pos,
          (state, p) => {
            tiles.push(state ? game.board.get(p) : 0);
          },
          true,
        );
        broadcast(id, [MessageType.CHORD, x, y, tiles]);

        if (!borders.flat().every((b) => game.board.neighbour(pos, b))) {
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

      if (game.gamemode === Gamemode.FLAGS) {
        game.currentPlayer =
          (game.currentPlayer + 1) % game.roundPlayers.length;
        broadcast(id, [
          MessageType.PLAYER,
          game.roundPlayers[game.currentPlayer],
        ]);
      }

      game.win = game.checkWin();
      if (game.win) {
        game.timer.stop();
        broadcast(id, [MessageType.END]);
      }
    } else if (msg.type === MessageType.FLAG) {
      if (game.loserId != null || game.gamemode === Gamemode.FLAGS) return;

      // Toggle flag
      const flagId = roomId + pos.toString();
      if (
        state >= WALL &&
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
        if (game.guessLevel != GuessLevel.None)
          broadcast(id, [MessageType.LOADING]);

        // Async game generation
        game.reset();
        generateBroadcast(id);
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

    if (!(id in persistentIds) && Object.values(game.users).length === 0)
      room.timeout = setTimeout(() => delete rooms[id], Room.TIMEOUT);

    game.flags.forEachCell((flag, p) => {
      if (flag[0] === user.id) game.flags.set(p, [INVALID_ID, flag[1]]);
    });

    if (game.roundPlayers != null && game.roundPlayers.includes(user.id)) {
      game.roundPlayers.splice(game.roundPlayers.indexOf(user.id), 1);
      game.currentPlayer %= game.roundPlayers.length;

      if (game.roundPlayers.length <= 1) return fail(id, INVALID_ID);

      broadcast(id, [
        MessageType.PLAYER,
        game.roundPlayers[game.currentPlayer],
      ]);
    }

    broadcast(id, [MessageType.DISCONNECT, user.id]);
  });
});
