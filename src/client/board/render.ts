import { Vector } from "../../util/Vector";
import { Color } from "../../util/Color";
import { FLAG, GameState, WALL } from "../../model/GameState";
import { Skin } from "./Skin";
import { boardOffset, cursorOffset } from "./board";
import { Position } from "../../util/Position";
import { MatrixType } from "../../util/Matrix";
import { AtlasTexture } from "./Texture";

export const GUI_SCALE = 2;
export const TILE_SIZE = 32;

const CURSOR_SMOOTHING = 0.5;

export function getBoardSize(game: GameState): Vector {
  const base = new Vector(game.board.width, game.board.height).multiply(
    TILE_SIZE,
  );
  if (game.type === MatrixType.HEX) {
    base.x += TILE_SIZE / 2 + 2;
    base.y = base.y * 0.875 + 9;
  }
  if (game.type === MatrixType.TRI) {
    base.x = base.x * 0.708;
    base.y *= 1.125;
  }
  return base;
}

export function getCanvasSize(skin: Skin, boardSize: Vector): Vector {
  return new Vector(
    boardSize.x +
      (skin.loaded
        ? (skin.frame.left + skin.frame.right) * skin.frame.scale * GUI_SCALE
        : 0),
    boardSize.y +
      (skin.loaded
        ? (skin.frame.top + skin.frame.bottom) * skin.frame.scale * GUI_SCALE
        : 0),
  );
}

const cursor = new Image();
cursor.src = "/img/cursor.png";

function tint(ctx: CanvasRenderingContext2D, color?: Color) {
  if (color) {
    const b = Math.floor(color.l * 2 + Math.max(color.l - 50, 0) * 6);
    ctx.filter = `hue-rotate(${color.h}deg) saturate(${Math.floor(
      color.s,
    )}%) brightness(${b}%)`;
  } else {
    ctx.filter = "none";
  }
}

function drawCounter(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  pos: Position,
  value: number,
  length: number,
) {
  let str = value.toString().substring(0, length);

  while (str.length < length) {
    if (str.startsWith("-")) str = "-0" + str.substring(1);
    else str = "0" + str;
  }

  const counterScale = skin.counter.scale * GUI_SCALE;

  const size = new Vector(
    skin.counter.left +
      length * skin.counterNumbers.tileSize.x +
      skin.counter.right,
    skin.counter.top + skin.counterNumbers.tileSize.y + skin.counter.bottom,
  ).times(counterScale);

  const actualPos = pos.offset(
    new Vector(ctx.canvas.width, ctx.canvas.height),
    size,
  );

  skin.counter.draw(ctx, actualPos, size, counterScale);

  const yoff = skin.counter.top * counterScale;

  for (let i = 0; i < length; i++) {
    const n = str[i] === "-" ? 10 : parseInt(str[i]);
    skin.counterNumbers.drawTile(
      ctx,
      new Vector(n, 0),
      new Vector(
        actualPos.x +
          (skin.counter.left + i * skin.counterNumbers.tileSize.x) *
            counterScale,
        actualPos.y + yoff,
      ),
      skin.counterNumbers.tileSize.times(counterScale),
    );
  }
}

function getTileset(game: GameState, skin: Skin, pos: Vector): AtlasTexture {
  if (game.type === MatrixType.HEX && skin.tilesHex != null) {
    return skin.tilesHex;
  } else if (game.type === MatrixType.TRI && skin.tilesTri != null) {
    if (Math.abs(pos.x % 2) === Math.abs(pos.y % 2)) return skin.tilesTri;
    else return skin.tilesTri2;
  }
  return skin.tiles;
}

function drawTilePos(
  game: GameState,
  skin: Skin,
  pos: Vector,
  tileSize: Vector,
): Vector {
  let tilePos = pos.times(tileSize);
  if (game.type === MatrixType.HEX) {
    if (Math.abs(pos.y % 2) === 1) tilePos.x += tileSize.x / 2;
    tilePos.y = tilePos.y * 0.77;
  }
  if (game.type === MatrixType.TRI) {
    tilePos.x = tilePos.x * 0.579;
    if (pos.x < 0) tilePos.x += TILE_SIZE * 0.01;
  }
  tilePos = tilePos
    .floor()
    .plus(
      new Vector(
        skin.frame.left * skin.frame.scale,
        skin.frame.top * skin.frame.scale,
      ).times(GUI_SCALE),
    );
  return tilePos;
}

export function getResetPosSize(
  canvas: HTMLCanvasElement,
  skin: Skin,
): [Vector, Vector] {
  const size = skin.button.tileSize.times(GUI_SCALE * skin.buttonScale);
  return [
    skin.buttonPos.offset(new Vector(canvas.width, canvas.height), size),
    size,
  ];
}

export function draw(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  game: GameState,
  drawSize: Vector,
) {
  if (!drawSize || !skin.loaded || !game.init) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  const chorded =
    game.clickedTile != null && game.board.get(game.clickedTile) < WALL;

  if (game.type === MatrixType.HEX) {
    for (let x = -1; x <= game.width; x++) {
      for (const y of [-1, game.height]) {
        const pos = new Vector(x, y);
        const tileset = getTileset(game, skin, pos);
        const tileSize = tileset.tileSize.times(TILE_SIZE / 16);

        tileset.drawTile(
          ctx,
          new Vector(1, 0),
          drawTilePos(game, skin, pos, tileSize),
          tileSize,
        );
      }
    }
  }

  if (game.type === MatrixType.HEX || game.type === MatrixType.TRI) {
    for (let y = -1; y <= game.height; y++) {
      for (const x of [-1, game.width]) {
        const pos = new Vector(x, y);
        const tileset = getTileset(game, skin, pos);
        const tileSize = tileset.tileSize.times(TILE_SIZE / 16);

        tileset.drawTile(
          ctx,
          new Vector(1, 0),
          drawTilePos(game, skin, new Vector(x, y), tileSize),
          tileSize,
        );
      }
    }
  }

  // Board
  game.board.forEachCell((n, pos) => {
    const tileset = getTileset(game, skin, pos);
    const tileSize = tileset.tileSize.times(TILE_SIZE / 16);

    const isMine = game.mines?.get(pos) ?? false;
    const tilePos = drawTilePos(game, skin, pos, tileSize);

    const clicked =
      n === WALL &&
      (pos.equals(game.clickedTile) ||
        (chorded && game.board.neighbour(pos, game.clickedTile)));

    tileset.drawTile(
      ctx,
      clicked || n < WALL || (isMine && n !== FLAG)
        ? new Vector(1, 0)
        : new Vector(0, 0),
      tilePos,
      tileSize,
    );

    if (
      n === WALL &&
      (!game.loading || game.win || game.loserId) &&
      !clicked &&
      pos.equals(game.startPos)
    )
      tileset.drawTile(ctx, new Vector(6, 0), tilePos, tileSize);

    if (clicked) return;

    if (isMine && n !== FLAG) {
      tileset.drawTile(ctx, new Vector(1, 0), tilePos, tileSize);
      if (n === 0) {
        tint(ctx, game.colors[game.loserId]);
        tileset.drawTile(ctx, new Vector(4, 0), tilePos, tileSize);
        tint(ctx);
      } else {
        tileset.drawTile(ctx, new Vector(3, 0), tilePos, tileSize);
      }
      return;
    }

    if (n === FLAG) {
      const color = game.colors[game.flags.get(pos)[1]];
      tint(ctx, color);
      tileset.drawTile(
        ctx,
        game.loserId == null || isMine ? new Vector(2, 0) : new Vector(5, 0),
        tilePos,
        tileSize,
      );
      tint(ctx);
    } else if (n > 0 && n < WALL) {
      tileset.drawTile(ctx, new Vector(n + 6, 0), tilePos, tileSize);
    }
  });

  skin.frame.draw(
    ctx,
    new Vector(0, 0),
    new Vector(canvas.width, canvas.height),
    skin.frame.scale * GUI_SCALE,
  );

  // GUI
  const flagCount = game.board.arr.reduce(
    (acc, s) => acc + (s === FLAG ? 1 : 0),
    0,
  );
  drawCounter(ctx, skin, skin.minesPos, game.mineCount - flagCount, 3);

  drawCounter(ctx, skin, skin.timerPos, game.timer.time, 3);

  skin.button.drawTile(
    ctx,
    game.loading
      ? new Vector(3, 0)
      : game.win
        ? new Vector(2, 0)
        : game.loserId != null
          ? new Vector(1, 0)
          : new Vector(0, 0),
    ...getResetPosSize(canvas, skin),
  );
}

export function drawCursors(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  game: GameState,
  skin: Skin,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "hanging";
  ctx.font = "normal 13px monospace";
  ctx.imageSmoothingEnabled = true;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const MARGIN = 3;
  Object.values(game.users)
    .filter((user) => user.cursorPos != null)
    .forEach((user) => {
      const pos = user.cursorPos
        .minus(cursorOffset(game))
        .plus(boardOffset(skin));
      ctx.drawImage(cursor, pos.x, pos.y);

      if (user.username) {
        const textPos = new Vector(
          pos.x + (cursor.width * 2) / 3,
          pos.y + cursor.height + 6,
        );

        const metrics = ctx.measureText(user.username);
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
        ctx.fillText(user.username, textPos.x, textPos.y);
      }
    });
}

export function getTilePos(game: GameState, mousePos: Vector): Vector {
  return game.board.getTilePos(
    mousePos.minus(cursorOffset(game)).div(TILE_SIZE),
  );
}

export function updateCursorPos(game: GameState) {
  Object.values(game.users).forEach((user) => {
    if (user.cursorPos && user.nextCursorPos)
      user.cursorPos = user.cursorPos
        .times(CURSOR_SMOOTHING)
        .plus(user.nextCursorPos.times(1 - CURSOR_SMOOTHING));
  });
}
