import {
  Message,
  MessageType,
  MessageValue,
  serializeMessage,
} from "../../model/messages";
import { Vector } from "../../util/Vector";
import { Matrix, MatrixType } from "../../util/Matrix";
import { Color } from "../../util/Color";
import {
  ChatMessageType,
  FLAG,
  GameState,
  GuessLevel,
  WALL,
} from "../../model/GameState";
import { throttled } from "../../util/util";
import { getBoardSize, getResetPosSize, getTilePos, GUI_SCALE } from "./render";
import { Skin } from "./Skin";
import React from "react";

function send(ws: WebSocket, data: MessageValue[]) {
  if (ws.readyState === WebSocket.OPEN) ws.send(serializeMessage(data));
}

export const sendPos = throttled((ws: WebSocket, pos: Vector) => {
  if (ws.readyState === WebSocket.OPEN) {
    send(ws, [MessageType.CURSOR, pos.x, pos.y]);
  }
}, 50);

export function boardOffset(skin: Skin): Vector {
  return new Vector(skin.frame.left, skin.frame.top).times(
    GUI_SCALE * skin.frame.scale,
  );
}

export function cursorOffset(game: GameState): Vector {
  return new Vector(2 ** 12).minus(getBoardSize(game)).div(2);
}

export function getCursorPos(
  canvas: HTMLCanvasElement,
  game: GameState,
  skin: Skin,
  evt: React.MouseEvent,
): Vector {
  const rect = canvas.getBoundingClientRect();
  return new Vector(evt.clientX - rect.left, evt.clientY - rect.top)
    .plus(cursorOffset(game))
    .minus(boardOffset(skin));
}

function updateClickedTile(game: GameState, tile: Vector) {
  game.clickedTile =
    game.board.inBounds(tile) && game.board.get(tile) != FLAG
      ? tile
      : undefined;
}

export function onMouseMove(
  ws: WebSocket,
  canvas: HTMLCanvasElement,
  game: GameState,
  skin: Skin,
  evt: React.MouseEvent,
  setCursorPos: (pos: Vector) => void,
) {
  const pos = getCursorPos(canvas, game, skin, evt);
  setCursorPos(pos);
  const tile = getTilePos(game, pos);
  if (game.holding) updateClickedTile(game, tile);
  sendPos(ws, pos);
}

export enum Action {
  BREAK,
  FLAG,
  CHORD,
}

export function onActionDown(game: GameState, tile: Vector, action: Action) {
  if (!game.win && !game.loading && !game.loserId && action === Action.BREAK) {
    game.holding = true;
    updateClickedTile(game, tile);
  }
}

export function onActionUp(
  ws: WebSocket,
  pos: Vector,
  game: GameState,
  skin: Skin,
  action: Action,
  canvas: HTMLCanvasElement,
) {
  const [resetPos, resetSize] = getResetPosSize(canvas, skin);

  game.holding = false;

  const actualPos = pos.plus(boardOffset(skin)).minus(cursorOffset(game));

  if (
    action === Action.BREAK &&
    actualPos.x >= resetPos.x &&
    actualPos.y >= resetPos.y &&
    actualPos.x <= resetPos.x + resetSize.x &&
    actualPos.y <= resetPos.y + resetSize.y &&
    (game.win || game.loserId != null)
  )
    return send(ws, [MessageType.RESET]);

  if ((game.win && action !== Action.FLAG) || game.loserId != null) return;

  const tilePos = getTilePos(game, pos);

  if (game.board.inBounds(tilePos)) {
    let sendMessage = true;

    const state = game.board.get(tilePos);
    if (
      state === 0 ||
      (state < WALL && action === Action.FLAG) ||
      (state === WALL && action === Action.CHORD) ||
      (state === FLAG && (action !== Action.FLAG || game.win))
    )
      sendMessage = false;

    if (sendMessage && state < WALL) {
      let chord = false;
      let count = 0;
      game.board.forEachNeighbor(tilePos, (s) => {
        if (s === FLAG) count++;
        else if (s === WALL) chord = true;
      });
      if (state !== count || !chord) sendMessage = false;
    }

    if (sendMessage)
      send(ws, [
        action === Action.BREAK
          ? MessageType.TILE
          : action === Action.CHORD
            ? MessageType.CHORD
            : MessageType.FLAG,
        tilePos.x,
        tilePos.y,
      ]);
    else game.clickedTile = undefined;
  }
}

export async function messageListener(
  canvas: HTMLCanvasElement | undefined,
  skin: Skin,
  game: GameState,
  msg: Message,
) {
  let pos: Vector;
  if (msg.x != null && msg.y != null)
    pos = new Vector(msg.x as number, msg.y as number);

  switch (msg.type) {
    case MessageType.INIT:
      game.width = msg.width as number;
      game.height = msg.height as number;
      game.type = msg.tileType as MatrixType;
      game.reset();
      game.init = true;

      game.timer.time = msg.time as number;
      if (msg.started) game.timer.start();
      game.mineCount = msg.mineCount as number;
      game.flags = new Matrix(
        game.width,
        game.height,
        game.type,
        (msg.flags as number[]).map(
          (flag) => [flag >> 5, flag & 0b11111] as [number, number],
        ),
      );
      game.guessLevel = msg.guessLevel as GuessLevel;
      game.startPos = msg.hasStart
        ? new Vector(msg.startX as number, msg.startY as number)
        : null;

      game.chat.push({
        type: ChatMessageType.INIT,
        users: Object.values(game.users).filter((u) => u.id !== msg.id),
      });
      break;

    case MessageType.USER: {
      const data = {
        color: Color.hsl(
          msg.hue as number,
          msg.saturation as number,
          msg.lightness as number,
        ),
        username: msg.username as string,
      };
      if (msg.update) {
        const user = game.users[msg.id as number];
        const oldUser = { ...user };

        game.users[msg.id as number] = {
          ...user,
          ...data,
        };

        if (game.init)
          game.chat.push({
            user: game.users[msg.id as number],
            oldUser,
            type: ChatMessageType.UPDATE,
          });
      } else {
        game.users[msg.id as number] = {
          id: msg.id as number,
          ...data,
        };

        if (game.init)
          game.chat.push({
            user: game.users[msg.id as number],
            type: ChatMessageType.JOIN,
          });
      }
      break;
    }

    case MessageType.DISCONNECT:
      game.chat.push({
        user: game.users[msg.id as number],
        type: ChatMessageType.LEAVE,
      });
      delete game.users[msg.id as number];
      game.flags.forEachCell((flag, p) => {
        if (flag[0] === msg.id) game.flags.set(p, [0, flag[1]]);
      });
      break;

    case MessageType.CURSOR:
      if ((msg.id as number) in game.users) {
        const user = game.users[msg.id as number];
        if (!user.cursorPos) user.cursorPos = pos;
        else user.nextCursorPos = pos;
      }
      break;

    case MessageType.TILE:
      game.clickedTile = undefined;
      game.timer.start();
      game.board.set(pos, (msg.tile as number) ?? 0);
      break;

    case MessageType.CHORD: {
      game.clickedTile = undefined;
      game.timer.start();
      let i = 0;
      game.board.forEachNeighbor(
        pos,
        (state, p) => {
          if (state === WALL)
            game.board.set(p, (msg.tiles?.[i] as number) ?? 0);
          i++;
        },
        true,
      );
      break;
    }

    case MessageType.HOLE:
      game.clickedTile = undefined;
      game.timer.start();
      game.openBorder(msg);
      if (msg.last) game.openHole(msg);
      break;

    case MessageType.BOARD:
      game.board = new Matrix(
        game.flags.width,
        game.flags.height,
        game.type,
        msg.tiles as number[],
      );
      break;

    case MessageType.FLAG:
      game.flags.set(pos, [msg.id as number, msg.colorId as number]);
      game.board.set(pos, game.board.get(pos) === WALL ? FLAG : WALL);
      break;

    case MessageType.WIN:
      game.timer.stop();
      game.win = true;
      break;

    case MessageType.LOSE:
      game.timer.stop();
      game.loserId = msg.id as number;
      game.mines = new Matrix(
        game.flags.width,
        game.flags.height,
        game.type,
        (msg.mines as number[]).map((m) => !!m),
      );
      break;

    case MessageType.RESET:
      game.mineCount = msg.mineCount as number;
      game.board.forEachCell((_, p) => {
        game.board.set(p, WALL);
      });
      game.timer.reset();
      game.mines = undefined;
      game.loserId = undefined;
      game.win = false;
      game.startPos = msg.hasStart
        ? new Vector(msg.startX as number, msg.startY as number)
        : null;
      game.loading = false;

      if (game.guessLevel != GuessLevel.None && game.startPos == null)
        game.chat.push({
          type: ChatMessageType.LOG,
          message: "Board generation timeout.",
        });
      break;

    case MessageType.CHAT:
      game.chat.push({
        user: game.users[msg.id as number],
        type: ChatMessageType.MESSAGE,
        message: msg.message as string,
      });
      break;

    case MessageType.COLOR:
      game.colors[msg.id as number] = Color.hsl(
        msg.hue as number,
        msg.saturation as number,
        msg.lightness as number,
      );
      break;

    case MessageType.LOADING:
      game.loading = true;
      break;
  }
}
