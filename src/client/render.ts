import { Vector } from "../util/Vector";
import { Color } from "../util/Color";
import { FLAG, WALL } from "../model/GameState";
import { game } from "./script";

const GUI_SCALE = 2;
const TILE_SIZE = 32;

const CURSOR_SMOOTHING = 0.5;

let drawBoardSize: Vector;

export const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

export function updateBoardSize(redraw = false) {
  drawBoardSize = new Vector(game.board.width, game.board.height).multiply(
    TILE_SIZE,
  );

  let change = false;
  if (canvas.width !== game.board.width) {
    change = true;
    canvas.width =
      drawBoardSize.x +
      (sprites.frame.left.width + sprites.frame.right.width) * GUI_SCALE;
  }
  if (canvas.height !== game.board.height) {
    change = true;
    canvas.height =
      drawBoardSize.y +
      (sprites.frame.top.height + sprites.frame.bottom.height) * GUI_SCALE;
  }
  if (change && redraw) draw();
}

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

function drawTile(pos: Vector, texture: HTMLImageElement) {
  ctx.drawImage(
    texture,
    pos.x * TILE_SIZE + sprites.frame.left.width * GUI_SCALE,
    pos.y * TILE_SIZE + sprites.frame.top.height * GUI_SCALE,
    TILE_SIZE,
    TILE_SIZE,
  );
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

export function getResetPosSize(): [number, number, number, number] {
  return [
    sprites.frame.left.width * GUI_SCALE +
      (drawBoardSize.x - sprites.button.normal.width * GUI_SCALE) / 2,
    30,
    sprites.button.normal.width * GUI_SCALE,
    sprites.button.normal.height * GUI_SCALE,
  ];
}

function draw() {
  if (!drawBoardSize) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  // Frame
  // TODO: 9 slice rendering
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
  const flagCount = game.board.arr.reduce(
    (acc, s) => acc + (s === 10 ? 1 : 0),
    0,
  );
  drawCounter(new Vector(32, 30), game.mineCount - flagCount, 3);

  ctx.drawImage(
    game.win
      ? sprites.button.win
      : game.loserId
      ? sprites.button.fail
      : sprites.button.normal,
    ...getResetPosSize(),
  );

  drawCounter(
    new Vector(canvas.width - 28 - counterWidth(3), 30),
    game.timer.time,
    3,
  );

  // Board
  game.board.forEachCell((n, pos) => {
    const isMine = game.mines?.get(pos) ?? false;

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
          game.users[game.loserId] && game.users[game.loserId].color,
        );
      else drawTile(pos, sprites.mine);
      return;
    }

    if (n === FLAG) {
      const id = game.flags.get(pos);
      drawTinted(
        pos,
        !game.loserId || isMine ? sprites.flag : sprites.mineWrong,
        game.users[id] && game.users[id].color,
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
  Object.values(game.users)
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

export function getTilePos(mousePos: Vector): Vector {
  return new Vector(
    Math.floor((mousePos.x - sprites.frame.left.width * GUI_SCALE) / TILE_SIZE),
    Math.floor((mousePos.y - sprites.frame.top.height * GUI_SCALE) / TILE_SIZE),
  );
}

setInterval(() => {
  Object.values(game.users).forEach((user) => {
    if (user.cursorPos && user.nextCursorPos)
      user.cursorPos = user.cursorPos
        .times(CURSOR_SMOOTHING)
        .plus(user.nextCursorPos.times(1 - CURSOR_SMOOTHING));
  });

  draw();
}, 1000 / 60);

canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());
