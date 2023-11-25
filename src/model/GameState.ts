import { Matrix } from "../util/Matrix";
import { UserConnection } from "./UserConnection";
import { Timer } from "../util/Timer";
import { Vector } from "../util/Vector";
import { shuffle } from "../util/util";
import { Message, MessageData, MessageType } from "./messages";
import { IdGen } from "../util/IdGen";

export const WALL = 9;
export const FLAG = 10;

export type State = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Border = Vector[];

export class GameState {
  width: number;
  height: number;
  mineCount: number;

  board: Matrix<State>;
  flags: Matrix<number>;

  mines?: Matrix<boolean>;
  counts?: Matrix<number>;

  timer: Timer;

  win: boolean;
  firstClick: boolean;
  loserId?: number;
  users: Record<string, UserConnection>;
  userIds: IdGen;

  constructor(width: number, height: number, mineCount: number) {
    this.width = Math.max(Math.min(width ?? 30, 50), 0);
    this.height = Math.max(Math.min(height ?? 16, 50), 0);
    this.mineCount = Math.max(Math.min(mineCount ?? 99, width * height - 1), 0);

    this.timer = new Timer({ max: 999 });
    this.users = {};
    this.userIds = new IdGen({ min: 1, max: 255 });

    this.reset();
  }

  reset() {
    this.mines = new Matrix<boolean>(this.width, this.height, false);
    this.counts = new Matrix(this.width, this.height, 0);
    this.board = new Matrix(this.width, this.height, WALL);
    this.flags = new Matrix(this.width, this.height, 0);
    this.firstClick = true;
    this.win = false;
    this.loserId = undefined;

    this.timer.reset();

    // Generate
    const positions = new Array(this.width * this.height)
      .fill(0)
      .map((_, i) => new Vector(Math.floor(i / this.height), i % this.height));
    const minesPos = shuffle(positions).slice(0, this.mineCount);

    minesPos.forEach((p) => this.mines.set(p, true));
    this.countMines();
  }

  countMines() {
    this.counts.forEachCell((_, p) => {
      let count = 0;
      this.mines.forEachNeighbor(p, (mine) => {
        if (mine) count++;
      });
      this.counts.set(p, count);
    });
  }

  moveFirstMine(pos: Vector) {
    if (this.mines.get(pos)) {
      const positions = [];
      this.mines.forEachCell((m, p) => {
        if (!m) positions.push(p);
      });
      const newPos = positions[Math.floor(Math.random() * positions.length)];

      this.mines.set(pos, false);
      this.mines.set(newPos, true);
    }

    this.countMines();

    this.firstClick = false;
  }

  open(pos: Vector): Border[] {
    const queue: Vector[] = [pos];
    const visited: Vector[] = [];
    const borders: Border[] = [];

    while (queue.length > 0) {
      const p = queue.pop();
      visited.push(p);

      const n = this.counts.get(p);
      this.board.set(p, n);

      // Build borders
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
      this.board.forEachNeighbor(p, (_, q) => {
        if (!filtered.some((f) => q.equals(f))) {
          queue.unshift(q);
        }
      });
    }

    // Merge borders
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

    return borders;
  }

  chord(pos: Vector): [boolean, Border[]] {
    let flagCount = 0;
    this.board.forEachNeighbor(pos, (s) => {
      if (s === FLAG) flagCount++;
    });

    const borders = [];
    if (flagCount === this.counts.get(pos)) {
      // Check for mines
      let failed = false;
      this.board.forEachNeighbor(pos, (s, p) => {
        if (s === WALL && this.mines.get(p)) failed = true;
      });
      if (failed) {
        this.board.forEachNeighbor(pos, (s, p) => {
          if (s === WALL) this.board.set(p, 0);
        });
        return [true, []];
      }

      this.board.forEachNeighbor(pos, (s, p) => {
        if (s === WALL) {
          borders.push(...this.open(p));
        } else {
          borders.push([p]);
        }
      });
    }
    // TODO: Check for same borders
    return [false, borders];
  }

  checkWin(): boolean {
    let win = true;
    this.board.forEachCell((state, p) => {
      if (!this.mines.get(p) && state >= WALL) win = false;
    });
    return win;
  }

  // HOLES
  static DIR_ENCODE = {
    0: {
      1: 0b00000,
      [-1]: 0b01000,
    },
    1: { 0: 0b10000 },
    [-1]: { 0: 0b11000 },
  };

  static DIR_DECODE = {
    0b00000: new Vector(0, 1),
    0b01000: new Vector(0, -1),
    0b10000: new Vector(1, 0),
    0b11000: new Vector(-1, 0),
  };

  getHoleMessage(border: Border, clickPos: Vector, last: boolean): MessageData {
    const start = border.pop();

    const directions: number[] = [];
    let prev: Vector;
    let current: Vector = undefined;

    while (border.length > 0) {
      prev = current ?? start;
      current = border.pop();

      directions.push(
        GameState.DIR_ENCODE[current.x - prev.x][current.y - prev.y] +
          this.counts.get(prev),
      );
    }
    directions.push(this.counts.get(current));

    return [
      MessageType.HOLE,
      clickPos.x,
      clickPos.y,
      start.x,
      start.y,
      last,
      directions,
    ];
  }

  openBorder(holeMessage: Message) {
    const pos = new Vector(
      holeMessage.startX as number,
      holeMessage.startY as number,
    );

    for (const direction of holeMessage.directions as number[]) {
      if (direction === 0) break;

      this.board.set(pos, direction & 0b111);
      pos.add(GameState.DIR_DECODE[direction & 0b11000]);
    }
  }

  openHole(holeMessage: Message) {
    const queue: Vector[] = [
      new Vector(holeMessage.clickX as number, holeMessage.clickY as number),
    ];
    const visited: Vector[] = [];

    while (queue.length > 0 && queue.length < 1000) {
      const pos = queue.pop();
      visited.push(pos);

      if (this.board.get(pos) === WALL) this.board.set(pos, 0);

      const filtered = [...visited, ...queue];
      this.board.forEachNeighbor(pos, (state, p) => {
        if (
          !filtered.some((q) => p.equals(q)) &&
          (state === WALL || state === 0)
        ) {
          queue.unshift(p);
          filtered.push(p);
        }
      });
    }
  }
}
