import { FLAG, GameState, GuessLevel, WALL } from "./GameState";
import { Vector } from "../util/Vector";

interface Constraint {
  count: number;
  pos: Vector[];
  hard?: boolean;
}

function constraintEquals(a: Constraint, b: Constraint) {
  return (
    a.count === b.count &&
    a.pos.length === b.pos.length &&
    a.pos.every((p) => b.pos.some((q) => p.equals(q)))
  );
}

export class Solver {
  game: GameState;

  constructor(game: GameState) {
    this.game = GameState.copy(game);
  }

  solve(): Vector | null {
    if (!this.game.firstClick) return null;

    const holes = [];
    this.game.counts.forEachCell((t, p) => {
      if (t == 0 && !this.game.mines.get(p)) holes.push(p);
    });
    const start = holes[Math.floor(Math.random() * holes.length)];
    this.game.open(start);

    let step: GuessLevel | null;
    let max = GuessLevel.Easy;

    do {
      step = this.step();
      if (step != null && step > max) max = step;
    } while (step != null);

    return max == this.game.guessLevel && this.game.checkWin() ? start : null;
  }

  stepConstraints(constraints: Constraint[]): boolean {
    let stepped = false;
    constraints.forEach((c) => {
      const overlapping = constraints.filter((d) => {
        const common = d.pos.filter((p) => c.pos.some((q) => q.equals(p)));
        return (
          (c.count === d.count && d.pos.length === common.length) ||
          c.count - d.count === c.pos.length - common.length
        );
      });

      overlapping.forEach((d) => {
        if (c.count === d.count)
          c.pos.forEach((p) => {
            if (!d.pos.some((q) => p.equals(q))) {
              this.game.open(p);
              stepped = true;
            }
          });
        else
          c.pos.forEach((p) => {
            if (!d.pos.some((q) => p.equals(q))) {
              this.game.board.set(p, FLAG);
              stepped = true;
            }
          });
      });
    });
    return stepped;
  }

  mineCount(constraints: Constraint[]) {
    let remainingMines = this.game.mineCount;
    let remainingWalls = 0;

    this.game.board.forEachCell((n) => {
      if (this.game.guessLevel === GuessLevel.Hard) {
        if (n === FLAG) remainingMines--;
        if (n === WALL) remainingWalls++;
      }
    });

    let max = -1;
    let maxSet: Constraint[];

    constraints.forEach((c) => {
      const set = [c];

      constraints.forEach((d) => {
        if (!set.some((s) => d.pos.some((p) => s.pos.some((q) => p.equals(q)))))
          set.push(d);
      });

      const val = set.reduce((sum, { count }) => sum + count, 0);
      if (val > max) {
        maxSet = set;
        max = val;
      }
    });

    if (max == remainingMines) {
      const maxPos = maxSet.flatMap(({ pos }) => pos);
      if (maxPos.length < remainingWalls) {
        this.game.board.forEachCell((n, p) => {
          if (n === WALL && !maxPos.some((q) => p.equals(q))) this.game.open(p);
        });
        return true;
      }
    }
    return false;
  }

  step(): GuessLevel | null {
    let stepped = false;
    const constraints: Constraint[] = [];

    this.game.board.forEachCell((n, p) => {
      if (n === 0 || n >= WALL) return;

      let flags = 0;
      let walls = 0;
      this.game.board.forEachNeighbor(p, (m) => {
        if (m === FLAG) {
          flags++;
          walls++;
        }
        if (m === WALL) walls++;
      });

      if (flags === walls) return;

      if (n == flags) {
        this.game.board.forEachNeighbor(p, (m, q) => {
          if (m === WALL) this.game.open(q);
        });
        stepped = true;
        return;
      }

      if (n == walls) {
        this.game.board.forEachNeighbor(p, (m, q) => {
          if (m === WALL) this.game.board.set(q, FLAG);
        });
        stepped = true;
        return;
      }

      if (this.game.guessLevel !== GuessLevel.Easy) {
        const pos = [];
        this.game.board.forEachNeighbor(p, (m, q) => {
          if (m === WALL) pos.push(q);
        });
        constraints.push({ count: n - flags, pos });
      }
    });

    if (stepped || this.game.guessLevel === GuessLevel.Easy)
      return stepped ? GuessLevel.Easy : null;

    stepped = this.stepConstraints(constraints);

    if (stepped || this.game.guessLevel === GuessLevel.Medium)
      return stepped ? GuessLevel.Medium : null;

    stepped = this.mineCount(constraints);

    if (stepped) return GuessLevel.Hard;

    // Calculate intermediary constraints
    let added;
    do {
      added = false;
      constraints.forEach((c) =>
        constraints.forEach((d) => {
          const common = d.pos.filter((p) => c.pos.some((q) => q.equals(p)));
          if (
            c.count > d.count &&
            c.count - d.count > 0 &&
            d.pos.length === common.length
          ) {
            const newCons: Constraint = {
              count: c.count - d.count,
              pos: c.pos.filter((p) => !d.pos.some((q) => p.equals(q))),
              hard: true,
            };
            if (!constraints.some((c) => constraintEquals(c, newCons))) {
              added = true;
              constraints.push(newCons);
            }
          }
        }),
      );
    } while (added);

    stepped = this.stepConstraints(constraints);

    if (stepped) return GuessLevel.Hard;

    stepped = this.mineCount(constraints);

    return stepped ? GuessLevel.Hard : null;
  }
}
