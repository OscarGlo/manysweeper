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
    console.log("GEN");
    if (!this.game.firstClick) return null;

    const holes = [];
    this.game.counts.forEachCell((t, p) => {
      if (t == 0 && !this.game.mines.get(p)) holes.push(p);
    });
    const start = holes[Math.floor(Math.random() * holes.length)];
    this.game.open(start);

    while (this.step()) {
      // loop until nothing to open
    }

    return this.game.checkWin() ? start : null;
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
              if (c.hard || d.hard) console.log("HARD");
              stepped = true;
            }
          });
        else
          c.pos.forEach((p) => {
            if (!d.pos.some((q) => p.equals(q))) {
              this.game.board.set(p, FLAG);
              if (c.hard || d.hard) console.log("HARD");
              stepped = true;
            }
          });
      });
    });
    return stepped;
  }

  step(): boolean {
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

    if (stepped || this.game.guessLevel === GuessLevel.Easy) return stepped;

    stepped = this.stepConstraints(constraints);

    if (stepped || this.game.guessLevel === GuessLevel.Medium) return stepped;

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

    return this.stepConstraints(constraints);
  }
}
