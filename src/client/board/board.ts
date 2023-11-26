import {
  deserializeMessage,
  formatMessageData,
  MessageType,
  MessageValue,
  serializeMessage,
} from "../../model/messages";
import { Vector } from "../../util/Vector";
import { Matrix } from "../../util/Matrix";
import { Color } from "../../util/Color";
import { FLAG, GameState, State, WALL } from "../../model/GameState";
import { throttled } from "../../util/util";
import { getResetPosSize, getTilePos, updateBoardSize } from "./render";
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

export function getMousePos(
  canvas: HTMLCanvasElement,
  evt: React.MouseEvent,
): Vector {
  const rect = canvas.getBoundingClientRect();
  return new Vector(evt.clientX - rect.left, evt.clientY - rect.top);
}

function updateClickedTile(
  canvas: HTMLCanvasElement,
  game: GameState,
  skin: Skin,
  evt: React.MouseEvent,
) {
  const pos = getMousePos(canvas, evt);
  const tile = getTilePos(skin, pos);
  game.clickedTile =
    game.board.inBounds(tile) && game.board.get(tile) != FLAG
      ? tile
      : undefined;
}

export function onMouseDown(
  canvas: HTMLCanvasElement,
  game: GameState,
  skin: Skin,
  evt: React.MouseEvent,
) {
  if (!game.win && !game.loserId && evt.button === 0) {
    game.holding = true;
    updateClickedTile(canvas, game, skin, evt);
  }
}

export function onMouseMove(
  ws: WebSocket,
  canvas: HTMLCanvasElement,
  game: GameState,
  skin: Skin,
  evt: React.MouseEvent,
) {
  if (game.holding) updateClickedTile(canvas, game, skin, evt);
  sendPos(ws, getMousePos(canvas, evt));
}

export function onMouseUp(
  ws: WebSocket,
  canvas: HTMLCanvasElement,
  game: GameState,
  skin: Skin,
  evt: React.MouseEvent,
) {
  const pos = getMousePos(canvas, evt);
  const button = evt.button;

  const [resetPos, resetSize] = getResetPosSize(skin);

  game.holding = false;

  if (
    button === 0 &&
    pos.x >= resetPos.x &&
    pos.y >= resetPos.y &&
    pos.x <= resetPos.x + resetSize.x &&
    pos.y <= resetPos.y + resetSize.y &&
    (game.win || game.loserId != null)
  ) {
    send(ws, [MessageType.RESET]);
  } else if (button === 0 || button === 1 || button === 2) {
    const tilePos = getTilePos(skin, pos);

    let sendMessage = true;

    if (game.board.inBounds(tilePos)) {
      const state = game.board.get(tilePos);
      if (
        state === 0 ||
        state === 8 ||
        (state < 8 && button === 2) ||
        (state === WALL && button === 1) ||
        (state === FLAG && button !== 2)
      )
        sendMessage = false;

      if (state < 8) {
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
          button === 0
            ? MessageType.TILE
            : button === 1
            ? MessageType.CHORD
            : MessageType.FLAG,
          tilePos.x,
          tilePos.y,
        ]);
      else game.clickedTile = undefined;
    }
  }
}

export async function messageListener(
  canvas: HTMLCanvasElement | undefined,
  skin: Skin,
  game: GameState,
  evt: MessageEvent,
) {
  const buf = await evt.data.arrayBuffer();
  const msg = formatMessageData(deserializeMessage(new Uint8Array(buf)));

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
      if (canvas) updateBoardSize(canvas, skin, game);
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
  }
}
