import {
  Message,
  MessageType,
  MessageValue,
  serializeMessage,
} from "../../model/messages";
import { Vector } from "../../util/Vector";
import { Matrix } from "../../util/Matrix";
import { Color } from "../../util/Color";
import { FLAG, GameState, State, WALL } from "../../model/GameState";
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
  const tile = getTilePos(game, skin, pos);
  if (game.holding) updateClickedTile(game, tile);
  sendPos(ws, pos);
}

export enum Action {
  BREAK,
  FLAG,
  CHORD,
}

export function onActionDown(game: GameState, tile: Vector, action: Action) {
  if (!game.win && !game.loserId && action === Action.BREAK) {
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

  const tilePos = getTilePos(game, skin, pos);

  let sendMessage = true;

  if (game.board.inBounds(tilePos)) {
    const state = game.board.get(tilePos);
    if (
      state === 0 ||
      state === 8 ||
      (state < 8 && action === Action.FLAG) ||
      (state === WALL && action === Action.CHORD) ||
      (state === FLAG && action !== Action.FLAG)
    )
      sendMessage = false;

    if (sendMessage && state < 8) {
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
      game.reset();
      game.init = true;
      game.width = msg.width as number;
      game.height = msg.height as number;
      game.timer.time = msg.time as number;
      if (msg.started) game.timer.start();
      game.mineCount = msg.mineCount as number;
      game.flags = new Matrix(game.width, game.height, msg.flags as number[]);
      break;

    case MessageType.USER:
      game.users[msg.id as number] = {
        id: msg.id as number,
        color: Color.hsl(
          msg.hue as number,
          msg.saturation as number,
          msg.lightness as number,
        ),
        username: msg.username as string,
      };
      break;

    case MessageType.DISCONNECT:
      delete game.users[msg.id as number];
      if (game.loserId === msg.id) game.loserId = 0;
      game.flags.forEachCell((id, p) => {
        if (id === msg.id) game.flags.set(p, 0);
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

    case MessageType.CHORD:
      game.clickedTile = undefined;
      game.timer.start();
      // eslint-disable-next-line no-case-declarations
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
        msg.tiles as State[],
      );
      break;

    case MessageType.FLAG:
      game.flags.set(pos, msg.id as number);
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
      break;

    case MessageType.CHAT: {
      const user = game.users[msg.id as number];
      game.chat.push({ user, message: msg.message as string });
      break;
    }
  }
}
