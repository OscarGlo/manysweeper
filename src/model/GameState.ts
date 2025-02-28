import { Matrix, MatrixType } from "../util/Matrix";
import { UserConnection } from "./UserConnection";
import { Timer } from "../util/Timer";
import { Vector } from "../util/Vector";
import { Message, MessageData, MessageType } from "./messages";
import { IdGen } from "../util/IdGen";
import { Color } from "../util/Color";
import { shuffle } from "../util/util";
import { Solver } from "./Solver";
import { EventEmitter } from "events";

export const WALL = 13;
export const FLAG = 14;

export type Border = Vector[];

export enum GuessLevel {
  None,
  Easy,
  Medium,
  Hard,
}

export enum Gamemode {
  COOP,
  FLAGS,
}

export enum ChatMessageType {
  INIT,
  MESSAGE,
  UPDATE,
  LOG,
}

export interface ChatMessage {
  type: ChatMessageType;
  user?: UserConnection;
  message?: string;
  oldUser?: UserConnection;
  users?: UserConnection[];
}

export class GameState extends EventEmitter {
  static MIN_WIDTH = 1;
  static MAX_WIDTH = 50;
  static MIN_HEIGHT = 1;
  static MAX_HEIGHT = 50;

  static MAX_GENERATE = 10 * 1000;

  width: number;
  height: number;
  mineCount: number;
  type: MatrixType;
  guessLevel: GuessLevel;
  gamemode: Gamemode;

  board: Matrix<number>;
  flags: Matrix<[number, number]>;

  mines?: Matrix<boolean>;
  counts?: Matrix<number>;

  timer: Timer;

  win: boolean;
  firstClick: boolean;
  loserId?: number;
  startPos?: Vector;

  users: Record<string, UserConnection>;
  userIds: IdGen;
  chat: ChatMessage[];
  colors: Record<string, Color>;
  colorIds: IdGen;

  // Flags
  roundPlayers: number[];
  currentPlayer: number;

  holding?: boolean;
  clickedTile?: Vector;
  init: boolean;
  loading: boolean;
  attempts: number;

  constructor(
    width: number,
    height: number,
    mineCount: number,
    type: MatrixType,
    guessLevel: GuessLevel,
    gamemode: Gamemode,
  ) {
    super();
    this.width = Math.max(
      Math.min(width ?? GameState.MAX_WIDTH, 50),
      GameState.MIN_WIDTH,
    );
    this.height = Math.max(
      Math.min(height ?? 16, GameState.MAX_HEIGHT),
      GameState.MIN_HEIGHT,
    );
    this.mineCount = Math.max(
      Math.min(mineCount ?? 99, this.width * this.height - 1),
      1,
    );
    this.type = type;
    this.guessLevel = gamemode === Gamemode.COOP ? guessLevel : GuessLevel.None;
    this.gamemode = gamemode;

    this.timer = new Timer({ max: 999 });
    this.users = {};
    this.userIds = new IdGen({ min: 1, max: 255 });
    this.chat = [];
    this.colors = {};
    this.colorIds = new IdGen({ min: 1, max: 32 });

    this.reset();
    this.init = true;
    this.attempts = 0;
  }

  static copy(game: GameState): GameState {
    const newGame = new GameState(
      game.width,
      game.height,
      game.mineCount,
      game.type,
      game.guessLevel,
      game.gamemode,
    );
    newGame.init = game.init;
    newGame.mines = Matrix.copy(game.mines);
    newGame.counts = Matrix.copy(game.counts);
    newGame.firstClick = game.firstClick;
    newGame.win = game.win;
    newGame.loserId = game.loserId;
    newGame.timer.time = game.timer.time;
    newGame.attempts = game.attempts;
    return newGame;
  }

  reset() {
    this.mines = new Matrix<boolean>(this.width, this.height, this.type, false);
    this.counts = new Matrix(this.width, this.height, this.type, 0);
    this.board = new Matrix(this.width, this.height, this.type, WALL);
    this.flags = new Matrix(this.width, this.height, this.type, () => [0, 0]);
    this.firstClick = true;
    this.win = false;
    this.loserId = undefined;
    this.colors = {};
    this.colorIds.reset();

    this.roundPlayers = undefined;
    this.currentPlayer = undefined;
    Object.values(this.users).forEach((user) => {
      user.score = 0;
    });

    this.timer.reset();
  }

  generate() {
    this.attempts = 0;
    const time = Date.now();
    do {
      this.mines = new Matrix<boolean>(
        this.width,
        this.height,
        this.type,
        false,
      );

      const positions = new Array(this.width * this.height)
        .fill(0)
        .map(
          (_, i) => new Vector(Math.floor(i / this.height), i % this.height),
        );
      const minesPos = shuffle(positions).slice(0, this.mineCount);

      minesPos.forEach((p) => this.mines.set(p, true));
      this.countMines();

      if (this.guessLevel != GuessLevel.None) {
        this.attempts++;
        this.startPos = new Solver(this).solve();
      }
    } while (
      this.guessLevel != GuessLevel.None &&
      this.startPos == null &&
      Date.now() - time < GameState.MAX_GENERATE
    );
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

      this.countMines();
    }
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
          if (this.board.adjacent(p, border[0])) {
            border.unshift(p);
            added = true;
            break;
          }
          if (
            border.length > 1 &&
            this.board.adjacent(p, border[border.length - 1])
          ) {
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
        if (this.board.adjacent(border[0], toAdd[0])) {
          border.unshift(...toAdd.reverse());
          added = true;
        } else if (this.board.adjacent(border[0], toAdd[toAdd.length - 1])) {
          border.unshift(...toAdd);
          added = true;
        } else if (this.board.adjacent(border[border.length - 1], toAdd[0])) {
          border.push(...toAdd);
          added = true;
        } else if (
          this.board.adjacent(
            border[border.length - 1],
            toAdd[toAdd.length - 1],
          )
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
      1: 0b000,
      [-1]: 0b001,
    },
    1: { 1: 0b010, 0: 0b011, [-1]: 0b100 },
    [-1]: { [-1]: 0b101, 0: 0b110, 1: 0b111 },
  };

  static DIR_DECODE = {
    0b000: new Vector(0, 1),
    0b001: new Vector(0, -1),
    0b010: new Vector(1, 1),
    0b011: new Vector(1, 0),
    0b100: new Vector(1, -1),
    0b101: new Vector(-1, -1),
    0b110: new Vector(-1, 0),
    0b111: new Vector(-1, 1),
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
        (GameState.DIR_ENCODE[current.x - prev.x][current.y - prev.y] << 3) +
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
      pos.add(GameState.DIR_DECODE[direction >> 3]);
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
