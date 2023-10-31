import { Matrix } from "./util/Matrix";
import { Vector } from "./util/Vector";

export const WALL = 9;
export const FLAG = 10;

function shuffle<T>(arr: T[]): T[] {
  arr = [...arr];
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const j = Math.floor(Math.random() * len);
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
  return arr;
}

export function generateMines(
  width: number,
  height: number,
  mineCount: number,
): Matrix<boolean> {
  const positions = new Array(width * height)
    .fill(0)
    .map((_, i) => new Vector(i % width, Math.floor(i / width)));
  const mines = shuffle(positions).slice(0, mineCount);

  return new Matrix<boolean>(width, height, (p) =>
    mines.some((q) => p.equals(q)),
  );
}

export function countNeighborMines(mines: Matrix<boolean>): Matrix<number> {
  return new Matrix<number>(mines.width, mines.height, (p) => {
    let count = 0;
    mines.forEachNeighbor(p, (mine) => {
      if (mine) count++;
    });
    return count;
  });
}

export function moveFirstMine(
  mines: Matrix<boolean>,
  pos: Vector,
): Matrix<boolean> {
  if (mines.get(pos)) {
    const positions = [];
    mines.forEachCell((m, p) => {
      if (!m) positions.push(p);
    });
    const newPos = positions[Math.floor(Math.random() * positions.length)];
    mines.set(pos, false);
    mines.set(newPos, true);
  }

  return mines;
}

export type Border = Vector[];

export function open(
  boardState: Matrix<number>,
  counts: Matrix<number>,
  pos: Vector,
): [Matrix<number>, Border[]] {
  const queue: Vector[] = [pos];
  const visited: Vector[] = [];
  const borders: Border[] = [];
  while (queue.length > 0) {
    const p = queue.pop();
    visited.push(p);

    const n = counts.get(p);
    boardState.set(p, n);

    if (n > 0) {
      let added = false;
      for (const border of borders) {
        if (p.hamming(border[0]) === 1) {
          border.unshift(p);
          added = true;
          break;
        }
        if (border.length > 1 && p.hamming(border[border.length - 1]) === 1) {
          border.push(p);
          added = true;
          break;
        }
      }
      if (!added) borders.push([p]);
      continue;
    }

    const filtered = [...visited, ...queue];
    boardState.forEachNeighbor(pos, (_, p) => {
      if (!filtered.some((q) => p.equals(q))) queue.unshift(p);
    });
  }

  for (let cur = 0; cur < borders.length; cur++) {
    const border = borders[cur];

    for (let i = cur + 1; i < borders.length; i++) {
      const toAdd = borders[i];

      let added = false;
      if (border[0].hamming(toAdd[0]) === 1) {
        border.unshift(...toAdd.reverse());
        added = true;
      } else if (border[0].hamming(toAdd[toAdd.length - 1]) === 1) {
        border.unshift(...toAdd);
        added = true;
      } else if (border[border.length - 1].hamming(toAdd[0]) === 1) {
        border.push(...toAdd);
        added = true;
      } else if (
        border[border.length - 1].hamming(toAdd[toAdd.length - 1]) === 1
      ) {
        border.push(...toAdd.reverse());
        added = true;
      }

      if (added) {
        borders.splice(i, 1);
        i = cur;
      }
    }
  }

  return [boardState, borders];
}

export function chord(
  boardState: Matrix<number>,
  mines: Matrix<boolean>,
  counts: Matrix<number>,
  pos: Vector,
): [Matrix<number>, boolean, Border[]] {
  let flagCount = 0;
  boardState.forEachNeighbor(pos, (s) => {
    if (s === FLAG) flagCount++;
  });

  const borders = [];
  if (flagCount === counts.get(pos)) {
    // Check for mines
    let failed = false;
    boardState.forEachNeighbor(pos, (s, p) => {
      if (s === WALL && mines.get(p)) failed = true;
    });
    if (failed) {
      boardState.forEachNeighbor(pos, (s, p) => {
        if (s === WALL) boardState.set(p, 0);
      });
      return [boardState, true, []];
    }

    boardState.forEachNeighbor(pos, (s, p) => {
      if (s === WALL) {
        let tileBorders;
        [boardState, tileBorders] = open(boardState, counts, p);
        borders.push(...tileBorders);
      } else {
        borders.push([p]);
      }
    });
  }
  // TODO: Check for same borders
  return [boardState, false, borders];
}

export function checkWin(
  boardState: Matrix<number>,
  mines: Matrix<boolean>,
): boolean {
  let win = true;
  boardState.forEachCell((state, p) => {
    if (!mines.get(p) && state >= WALL) win = false;
  });
  return win;
}
