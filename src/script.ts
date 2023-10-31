import {
  deserializeMessage,
  formatMessageData,
  MessageType,
  serializeMessage,
} from "./messages";
import { openBorder, openHole } from "./hole";
import { Vector } from "./util/Vector";
import { UserConnection } from "./model/UserConnection";
import { Matrix } from "./util/Matrix";
import { FLAG, WALL } from "./minesweeper";
import { Color } from "./util/Color";

let id: number;

let boardState: Matrix<number>;
let flags: Matrix<number>;
let mines: Matrix<boolean>;
let mineCount: number;
let time: number;
let win: boolean;
let loserId: number;

let drawBoardSize: Vector;

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let loadingCount = 0;

function loadImage(path: string): HTMLImageElement {
  loadingCount++;
  const img = new Image();
  img.src = "img/" + path + ".png";
  img.addEventListener("load", () => {
    loadingCount--;
    if (loadingCount === 0) {
      draw();
      updateBoardSize(true);
    }
  });
  return img;
}

const sprites = {
  cursor: loadImage("cursor"),
  tile: loadImage("board/tile"),
  block: loadImage("board/block"),
  flag: loadImage("board/flag"),
  mine: loadImage("board/mine"),
  mineHit: loadImage("board/mine_hit"),
  mineWrong: loadImage("board/mine_wrong"),
  numbers: [
    null,
    loadImage("board/number_1"),
    loadImage("board/number_2"),
    loadImage("board/number_3"),
    loadImage("board/number_4"),
    loadImage("board/number_5"),
    loadImage("board/number_6"),
    loadImage("board/number_7"),
    loadImage("board/number_8"),
  ],
  frame: {
    topLeft: loadImage("frame/top_left"),
    top: loadImage("frame/top"),
    topRight: loadImage("frame/top_right"),
    left: loadImage("frame/left"),
    right: loadImage("frame/right"),
    bottomLeft: loadImage("frame/bottom_left"),
    bottom: loadImage("frame/bottom"),
    bottomRight: loadImage("frame/bottom_right"),
  },
  counter: {
    left: loadImage("gui/counter_left"),
    middle: loadImage("gui/counter_middle"),
    right: loadImage("gui/counter_right"),
    numbers: {
      0: loadImage("gui/number_0"),
      1: loadImage("gui/number_1"),
      2: loadImage("gui/number_2"),
      3: loadImage("gui/number_3"),
      4: loadImage("gui/number_4"),
      5: loadImage("gui/number_5"),
      6: loadImage("gui/number_6"),
      7: loadImage("gui/number_7"),
      8: loadImage("gui/number_8"),
      9: loadImage("gui/number_9"),
      "-": loadImage("gui/number_minus"),
    },
  },
  button: {
    normal: loadImage("gui/button"),
    win: loadImage("gui/button_win"),
    fail: loadImage("gui/button_fail"),
  },
};

const users: Record<number, UserConnection> = {};

const GUI_SCALE = 2;
const TILE_SIZE = 32;

function drawTile(pos: Vector, texture: HTMLImageElement) {
  ctx.drawImage(
    texture,
    pos.x * TILE_SIZE + sprites.frame.left.width * GUI_SCALE,
    pos.y * TILE_SIZE + sprites.frame.top.height * GUI_SCALE,
    TILE_SIZE,
    TILE_SIZE,
  );
}

function counterWidth(length: number): number {
  return (
    (sprites.counter.left.width +
      length * sprites.counter.numbers[0].width +
      sprites.counter.right.width) *
    GUI_SCALE
  );
}

function drawCounter(pos: Vector, value: number, length: number) {
  let str = value.toString();
  if (length) {
    str = str.substring(0, length);

    while (str.length < length) {
      if (str.startsWith("-")) str = "-0" + str.substring(1);
      else str = "0" + str;
    }
  }
  const width = str.length * sprites.counter.numbers[0].width * GUI_SCALE;

  ctx.drawImage(
    sprites.counter.left,
    pos.x,
    pos.y,
    sprites.counter.left.width * GUI_SCALE,
    sprites.counter.left.height * GUI_SCALE,
  );
  ctx.drawImage(
    sprites.counter.middle,
    pos.x + sprites.counter.left.width * GUI_SCALE,
    pos.y,
    width,
    sprites.counter.middle.height * GUI_SCALE,
  );
  ctx.drawImage(
    sprites.counter.right,
    pos.x + sprites.counter.left.width * GUI_SCALE + width,
    pos.y,
    sprites.counter.right.width * GUI_SCALE,
    sprites.counter.right.height * GUI_SCALE,
  );

  const yoff = sprites.counter.left.height - sprites.counter.numbers[0].height;

  for (let i = 0; i < str.length; i++) {
    const sprite = sprites.counter.numbers[str[i]];
    ctx.drawImage(
      sprite,
      pos.x + (sprites.counter.left.width + i * sprite.width) * GUI_SCALE,
      pos.y + yoff,
      sprite.width * GUI_SCALE,
      sprite.height * GUI_SCALE,
    );
  }
}

function buttonPosSize(): [number, number, number, number] {
  return [
    sprites.frame.left.width * GUI_SCALE +
      (drawBoardSize.x - sprites.button.normal.width * GUI_SCALE) / 2,
    30,
    sprites.button.normal.width * GUI_SCALE,
    sprites.button.normal.height * GUI_SCALE,
  ];
}

function drawTinted(pos: Vector, sprite: HTMLImageElement, color: Color) {
  if (color) {
    const b = Math.floor(color.l * 2 + Math.max(color.l - 50, 0) * 6);
    ctx.filter = `hue-rotate(${color.h}deg) saturate(${Math.floor(
      color.s,
    )}%) brightness(${b}%)`;
  }
  drawTile(pos, sprite);
  if (color) ctx.filter = "none";
}

function draw() {
  if (!drawBoardSize) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  // Frame
  ctx.drawImage(
    sprites.frame.topLeft,
    0,
    0,
    sprites.frame.left.width * GUI_SCALE,
    sprites.frame.top.height * GUI_SCALE,
  );
  ctx.drawImage(
    sprites.frame.top,
    sprites.frame.left.width * GUI_SCALE,
    0,
    drawBoardSize.x,
    sprites.frame.topLeft.height * GUI_SCALE,
  );
  ctx.drawImage(
    sprites.frame.topRight,
    sprites.frame.left.width * GUI_SCALE + drawBoardSize.x,
    0,
    sprites.frame.right.width * GUI_SCALE,
    sprites.frame.top.height * GUI_SCALE,
  );

  ctx.drawImage(
    sprites.frame.left,
    0,
    sprites.frame.top.height * GUI_SCALE,
    sprites.frame.left.width * GUI_SCALE,
    drawBoardSize.y,
  );
  ctx.drawImage(
    sprites.frame.right,
    sprites.frame.left.width * GUI_SCALE + drawBoardSize.x,
    sprites.frame.top.height * GUI_SCALE,
    sprites.frame.right.width * GUI_SCALE,
    drawBoardSize.y,
  );

  ctx.drawImage(
    sprites.frame.bottomLeft,
    0,
    sprites.frame.top.height * GUI_SCALE + drawBoardSize.y,
    sprites.frame.left.width * GUI_SCALE,
    sprites.frame.bottom.height * GUI_SCALE,
  );
  ctx.drawImage(
    sprites.frame.bottom,
    sprites.frame.left.width * GUI_SCALE,
    sprites.frame.top.height * GUI_SCALE + drawBoardSize.y,
    drawBoardSize.x,
    sprites.frame.bottom.height * GUI_SCALE,
  );
  ctx.drawImage(
    sprites.frame.bottomRight,
    sprites.frame.left.width * GUI_SCALE + drawBoardSize.x,
    sprites.frame.top.height * GUI_SCALE + drawBoardSize.y,
    sprites.frame.right.width * GUI_SCALE,
    sprites.frame.bottom.height * GUI_SCALE,
  );

  // GUI
  const flagCount = boardState.arr.reduce(
    (acc, s) => acc + (s === 10 ? 1 : 0),
    0,
  );
  drawCounter(new Vector(32, 30), mineCount - flagCount, 3);

  ctx.drawImage(
    win
      ? sprites.button.win
      : mines
      ? sprites.button.fail
      : sprites.button.normal,
    ...buttonPosSize(),
  );

  drawCounter(new Vector(canvas.width - 28 - counterWidth(3), 30), time, 3);

  // Board
  boardState.forEachCell((n, pos) => {
    const isMine = mines && mines.get(pos);

    drawTile(
      pos,
      n < 8 || (isMine && n !== FLAG) ? sprites.tile : sprites.block,
    );

    if (isMine && n !== FLAG) {
      drawTile(pos, sprites.tile);
      if (n === 0)
        drawTinted(
          pos,
          sprites.mineHit,
          users[loserId] && users[loserId].color,
        );
      else drawTile(pos, sprites.mine);
      return;
    }

    if (n === FLAG) {
      const id = flags.get(pos);
      drawTinted(
        pos,
        !mines || isMine ? sprites.flag : sprites.mineWrong,
        users[id] && users[id].color,
      );
    } else if (n > 0 && n < WALL) {
      drawTile(pos, sprites.numbers[n]);
    }
  });

  // Cursors
  ctx.textAlign = "center";
  ctx.textBaseline = "hanging";
  ctx.font = "normal 13px monospace";
  ctx.imageSmoothingEnabled = true;

  const MARGIN = 3;
  Object.values(users)
    .filter((user) => user.cursorPos != null)
    .forEach((user) => {
      ctx.drawImage(sprites.cursor, user.cursorPos.x, user.cursorPos.y);

      if (user.username) {
        const displayName =
          user.username.length > 16
            ? user.username.substring(0, 16) + "…"
            : user.username;

        const textPos = new Vector(
          user.cursorPos.x + (sprites.cursor.width * 2) / 3,
          user.cursorPos.y + sprites.cursor.height + 6,
        );

        const metrics = ctx.measureText(displayName);
        const height =
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(
          textPos.x - metrics.width / 2 - MARGIN,
          textPos.y - MARGIN,
          metrics.width + MARGIN * 2,
          height + MARGIN * 2,
        );

        ctx.fillStyle = "white";
        ctx.fillText(displayName, textPos.x, textPos.y);
      }
    });
}

const CURSOR_SMOOTHING = 0.5;

setInterval(() => {
  Object.values(users).forEach((user) => {
    if (user.cursorPos && user.nextCursorPos)
      user.cursorPos = user.cursorPos
        .times(CURSOR_SMOOTHING)
        .plus(user.nextCursorPos.times(1 - CURSOR_SMOOTHING));
  });
  draw();
}, 1000 / 60);

let ws = new WebSocket("wss://" + location.host);

function send(data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(serializeMessage(data));
}

function throttled(cb, delay) {
  let timeout, nextArgs;

  return (...args) => {
    if (timeout) {
      nextArgs = args;
    } else {
      cb(...args);

      timeout = setTimeout(() => {
        if (nextArgs) {
          cb(...nextArgs);
          nextArgs = undefined;
        }
        timeout = undefined;
      }, delay);
    }
  };
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

canvas.addEventListener("mouseup", (evt) => {
  const pos = getMousePos(evt);
  const button = evt.button;

  const reset = buttonPosSize();

  if (
    button === 0 &&
    pos.x >= reset[0] &&
    pos.y >= reset[1] &&
    pos.x <= reset[0] + reset[2] &&
    pos.y <= reset[1] + reset[3] &&
    (win || mines)
  ) {
    send([MessageType.RESET]);
  } else if (button === 0 || button === 1 || button === 2) {
    const tilePos = new Vector(
      Math.floor((pos.x - sprites.frame.left.width * GUI_SCALE) / TILE_SIZE),
      Math.floor((pos.y - sprites.frame.top.height * GUI_SCALE) / TILE_SIZE),
    );

    if (
      tilePos.x >= 0 &&
      tilePos.x < boardState.width &&
      tilePos.y >= 0 &&
      tilePos.y < boardState.height
    ) {
      const state = boardState.get(tilePos);
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
        boardState.forEachCell((s) => {
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

canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());

function updateBoardSize(redraw = false) {
  drawBoardSize = new Vector(boardState.width, boardState.height).multiply(
    TILE_SIZE,
  );

  let change = false;
  if (canvas.width !== boardState.width) {
    change = true;
    canvas.width =
      drawBoardSize.x +
      (sprites.frame.left.width + sprites.frame.right.width) * GUI_SCALE;
  }
  if (canvas.height !== boardState.height) {
    change = true;
    canvas.height =
      drawBoardSize.y +
      (sprites.frame.top.height + sprites.frame.bottom.height) * GUI_SCALE;
  }
  if (change && redraw) draw();
}

// TODO Generic timer function lib
let timerInterval;

function startTimer() {
  if (timerInterval == null)
    timerInterval = setInterval(() => {
      time++;

      if (time >= 999) stopTimer();
    }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = undefined;
}

async function messageListener(evt) {
  const buf = await evt.data.arrayBuffer();
  const msg = formatMessageData(deserializeMessage(new Uint8Array(buf)));

  console.log("MESSAGE", msg);

  let pos: Vector;
  if (msg.x != null && msg.y != null)
    pos = new Vector(msg.x as number, msg.y as number);

  switch (msg.type) {
    case MessageType.INIT:
      id = msg.id as number;
      time = msg.time as number;
      mineCount = msg.mineCount as number;
      flags = new Matrix<number>(
        msg.width as number,
        msg.height as number,
        msg.flags as number[],
      );
      break;

    case MessageType.USER:
      users[msg.id as number] = {
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
      delete users[msg.id as number];
      if (loserId === msg.id) loserId = 0;
      flags.forEachCell((id, p) => {
        if (id === msg.id) flags.set(p, 0);
      });
      break;

    case MessageType.CURSOR:
      if ((msg.id as number) in users) {
        const user = users[msg.id as number];
        if (!user.cursorPos) user.cursorPos = pos;
        else user.nextCursorPos = pos;
      }
      break;

    case MessageType.TILE:
      startTimer();
      boardState.set(pos, (msg.tile as number) ?? 0);
      break;

    case MessageType.CHORD:
      startTimer();
      // eslint-disable-next-line no-case-declarations
      let i = 0;
      boardState.forEachNeighbor(
        pos,
        (state, p) => {
          if (state === WALL)
            boardState.set(p, (msg.tiles?.[i] as number) ?? 0);
          i++;
        },
        true,
      );
      break;

    case MessageType.HOLE:
      startTimer();
      boardState = openBorder(boardState, msg);
      if (msg.last) boardState = openHole(boardState, msg);
      break;

    case MessageType.BOARD:
      boardState = new Matrix(flags.width, flags.height, msg.tiles as number[]);
      updateBoardSize();
      break;

    case MessageType.FLAG:
      flags.set(pos, msg.id as number);
      boardState.set(pos, boardState.get(pos) === WALL ? FLAG : WALL);
      break;

    case MessageType.WIN:
      stopTimer();
      win = true;
      break;

    case MessageType.LOSE:
      stopTimer();
      loserId = msg.id as number;
      mines = new Matrix(
        flags.width,
        flags.height,
        (msg.mines as number[]).map((m) => !!m),
      );
      break;

    case MessageType.RESET:
      mineCount = msg.mineCount as number;
      boardState.forEachCell((_, p) => {
        boardState.set(p, WALL);
      });
      time = 0;
      mines = undefined;
      win = false;
      break;
  }

  draw();
}

ws.addEventListener("message", messageListener);

ws.addEventListener("error", (evt) => {
  evt.preventDefault();

  ws = new WebSocket("ws://" + location.host);
  ws.addEventListener("message", messageListener);
});
