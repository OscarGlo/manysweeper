import { Vector } from "../../util/Vector";
import { Color } from "../../util/Color";
import { FLAG, WALL } from "../../model/GameState";
import { game } from "../script";
import { Skin } from "./Skin";

const GUI_SCALE = 2;
const TILE_SIZE = 32;

const CURSOR_SMOOTHING = 0.5;

let drawBoardSize: Vector;

export const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

export const skin = new Skin("classic");

export function updateBoardSize(redraw = false) {
  drawBoardSize = new Vector(game.board.width, game.board.height).multiply(
    TILE_SIZE,
  );

  let change = false;
  if (canvas.width !== game.board.width) {
    change = true;
    canvas.width =
      drawBoardSize.x + (skin.frame.left + skin.frame.right) * GUI_SCALE;
  }
  if (canvas.height !== game.board.height) {
    change = true;
    canvas.height =
      drawBoardSize.y + (skin.frame.top + skin.frame.bottom) * GUI_SCALE;
  }
  if (change && redraw) draw();
}

skin.on("load", () => updateBoardSize(true));

const cursor = new Image();
cursor.src = "img/cursor.png";

function tint(color?: Color) {
  if (color) {
    const b = Math.floor(color.l * 2 + Math.max(color.l - 50, 0) * 6);
    ctx.filter = `hue-rotate(${color.h}deg) saturate(${Math.floor(
      color.s,
    )}%) brightness(${b}%)`;
  } else {
    ctx.filter = "none";
  }
}

function drawCounter(pos: Vector, value: number, length: number) {
  let str = value.toString().substring(0, length);

  while (str.length < length) {
    if (str.startsWith("-")) str = "-0" + str.substring(1);
    else str = "0" + str;
  }

  skin.counter.draw(
    ctx,
    pos,
    new Vector(
      skin.counter.left +
        length * skin.counterNumbers.tileSize.x +
        skin.counter.right,
      skin.counter.top + skin.counterNumbers.tileSize.y + skin.counter.bottom,
    ).times(GUI_SCALE),
    GUI_SCALE,
  );

  const yoff = skin.counter.height - skin.counterNumbers.tileSize.y;

  for (let i = 0; i < length; i++) {
    const n = str[i] === "-" ? 10 : parseInt(str[i]);
    skin.counterNumbers.drawTile(
      ctx,
      new Vector(n, 0),
      new Vector(
        pos.x +
          (skin.counter.left + i * skin.counterNumbers.tileSize.x) * GUI_SCALE,
        pos.y + yoff,
      ),
      skin.counterNumbers.tileSize.times(GUI_SCALE),
    );
  }
}

export function getResetPosSize(): [Vector, Vector] {
  return [
    new Vector(
      skin.frame.left * GUI_SCALE +
        (drawBoardSize.x - skin.button.tileSize.x * GUI_SCALE) / 2,
      30,
    ),
    skin.button.tileSize.times(GUI_SCALE),
  ];
}

function draw() {
  if (!drawBoardSize || !skin.loaded) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  // skin.frame
  skin.frame.draw(
    ctx,
    new Vector(0, 0),
    new Vector(canvas.width, canvas.height),
    GUI_SCALE,
  );

  // GUI
  const flagCount = game.board.arr.reduce(
    (acc, s) => acc + (s === 10 ? 1 : 0),
    0,
  );
  drawCounter(new Vector(32, 30), game.mineCount - flagCount, 3);

  skin.button.drawTile(
    ctx,
    game.win
      ? new Vector(2, 0)
      : game.loserId != null
      ? new Vector(1, 0)
      : new Vector(0, 0),
    ...getResetPosSize(),
  );

  drawCounter(
    new Vector(
      canvas.width -
        28 -
        (skin.counter.left +
          3 * skin.counterNumbers.tileSize.x +
          skin.counter.right) *
          GUI_SCALE,
      30,
    ),
    game.timer.time,
    3,
  );

  // Board
  game.board.forEachCell((n, pos) => {
    const isMine = game.mines?.get(pos) ?? false;

    const tilePos = new Vector(
      pos.x * TILE_SIZE + skin.frame.left * GUI_SCALE,
      pos.y * TILE_SIZE + skin.frame.top * GUI_SCALE,
    );
    const tileSize = new Vector(TILE_SIZE, TILE_SIZE);

    skin.tiles.drawTile(
      ctx,
      n < 8 || (isMine && n !== FLAG) ? new Vector(1, 0) : new Vector(0, 0),
      tilePos,
      tileSize,
    );

    if (isMine && n !== FLAG) {
      skin.tiles.drawTile(ctx, new Vector(1, 0), tilePos, tileSize);
      if (n === 0) {
        tint(game.users[game.loserId] && game.users[game.loserId].color);
        skin.tiles.drawTile(ctx, new Vector(4, 0), tilePos, tileSize);
        tint();
      } else {
        skin.tiles.drawTile(ctx, new Vector(3, 0), tilePos, tileSize);
      }
      return;
    }

    if (n === FLAG) {
      const id = game.flags.get(pos);
      tint(game.users[id] && game.users[id].color);
      skin.tiles.drawTile(
        ctx,
        game.loserId == null || isMine ? new Vector(2, 0) : new Vector(5, 0),
        tilePos,
        tileSize,
      );
      tint();
    } else if (n > 0 && n < WALL) {
      skin.tiles.drawTile(ctx, new Vector(n + 5, 0), tilePos, tileSize);
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
      ctx.drawImage(cursor, user.cursorPos.x, user.cursorPos.y);

      if (user.username) {
        const displayName =
          user.username.length > 16
            ? user.username.substring(0, 16) + "…"
            : user.username;

        const textPos = new Vector(
          user.cursorPos.x + (cursor.width * 2) / 3,
          user.cursorPos.y + cursor.height + 6,
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
    Math.floor((mousePos.x - skin.frame.left * GUI_SCALE) / TILE_SIZE),
    Math.floor((mousePos.y - skin.frame.top * GUI_SCALE) / TILE_SIZE),
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
