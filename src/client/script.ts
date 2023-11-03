import {
  deserializeMessage,
  formatMessageData,
  MessageType,
  serializeMessage,
} from "../messages";
import { Vector } from "../util/Vector";
import { Matrix } from "../util/Matrix";
import { Color } from "../util/Color";
import { FLAG, GameState, State, WALL } from "../model/GameState";
import { throttled } from "../util/util";
import {
  canvas,
  getResetPosSize,
  getTilePos,
  skin,
  updateBoardSize,
} from "./rendering/render";
import cookie from "cookie";

// Options
const cookies = cookie.parse(document.cookie ?? "");

const skinSelect = document.getElementsByName("skin")[0] as HTMLSelectElement;

if (cookies.skin) {
  skinSelect.value = cookies.skin;
  skin.load(skinSelect.value);
}

skinSelect.addEventListener("change", () => {
  cookies.skin = skinSelect.value;
  document.cookie = cookie.serialize("skin", skinSelect.value);
  skin.load(skinSelect.value);
});

const bgColor = document.getElementsByName("bgColor")[0] as HTMLSelectElement;

if (cookies.bgColor) {
  bgColor.value = cookies.bgColor;
  document.body.style.backgroundColor = bgColor.value;
}

bgColor.addEventListener("change", () => {
  cookies.bgColor = bgColor.value;
  document.cookie = cookie.serialize("bgColor", bgColor.value);
  document.body.style.backgroundColor = bgColor.value;
});

// Game logic
export const game = new GameState(0, 0, 0);

let id: number;

let ws = new WebSocket("wss://" + location.host);

function send(data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(serializeMessage(data));
}

const sendPos = throttled((pos: Vector) => {
  if (ws.readyState === WebSocket.OPEN) {
    send([MessageType.CURSOR, id, pos.x, pos.y]);
  }
}, 50);

canvas.addEventListener("mousemove", (evt) => {
  sendPos(getMousePos(evt));
});

function getMousePos(evt): Vector {
  const rect = canvas.getBoundingClientRect();
  return new Vector(evt.clientX - rect.left, evt.clientY - rect.top);
}

canvas.addEventListener("mousedown", (evt) => {
  const pos = getMousePos(evt);
  const button = evt.button;

  const [resetPos, resetSize] = getResetPosSize();

  if (
    button === 0 &&
    pos.x >= resetPos.x &&
    pos.y >= resetPos.y &&
    pos.x <= resetPos.x + resetSize.x &&
    pos.y <= resetPos.y + resetSize.y &&
    (game.win || game.loserId != null)
  ) {
    send([MessageType.RESET]);
  } else if (button === 0 || button === 1 || button === 2) {
    const tilePos = getTilePos(pos);

    if (game.board.inBounds(tilePos)) {
      const state = game.board.get(tilePos);
      if (
        state === 0 ||
        state === 8 ||
        (state < 8 && button === 2) ||
        (state === WALL && button === 1) ||
        (state === FLAG && button !== 2)
      )
        return;

      if (state < 8) {
        let chord = false;
        let count = 0;
        game.board.forEachNeighbor(tilePos, (s) => {
          if (s === FLAG) count++;
          else if (s === WALL) chord = true;
        });
        if (state !== count || !chord) return;
      }

      send([
        button === 0
          ? MessageType.TILE
          : button === 1
          ? MessageType.CHORD
          : MessageType.FLAG,
        tilePos.x,
        tilePos.y,
      ]);
    }

    evt.preventDefault();
  }
});

async function messageListener(evt) {
  const buf = await evt.data.arrayBuffer();
  const msg = formatMessageData(deserializeMessage(new Uint8Array(buf)));

  let pos: Vector;
  if (msg.x != null && msg.y != null)
    pos = new Vector(msg.x as number, msg.y as number);

  switch (msg.type) {
    case MessageType.INIT:
      id = msg.id as number;

      game.reset();
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
      game.timer.start();
      game.board.set(pos, (msg.tile as number) ?? 0);
      break;

    case MessageType.CHORD:
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
      updateBoardSize();
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

ws.addEventListener("message", messageListener);

ws.addEventListener("error", (evt) => {
  evt.preventDefault();

  ws = new WebSocket("ws://" + location.host);
  ws.addEventListener("message", messageListener);
});
