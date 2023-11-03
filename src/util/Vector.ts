export class Vector {
  x: number;
  y: number;

  constructor(x: Vector | number = 0, y?: number) {
    [this.x, this.y] = x instanceof Vector ? [x.x, x.y] : [x, y ?? x];
  }

  map(op: (u: number, v: number) => number, v: Vector | number): Vector {
    return new Vector(
      op(this.x, typeof v === "number" ? v : v.x),
      op(this.y, typeof v === "number" ? v : v.y),
    );
  }

  plus(v: Vector | number): Vector {
    return this.map((a, b) => a + b, v);
  }
  minus(v: Vector | number): Vector {
    return this.map((a, b) => a - b, v);
  }
  times(v: Vector | number): Vector {
    return this.map((a, b) => a * b, v);
  }
  div(v: Vector | number): Vector {
    return this.map((a, b) => a / b, v);
  }

  apply(op: (u: number, v: number) => number, v: Vector | number): Vector {
    this.x = op(this.x, typeof v === "number" ? v : v.x);
    this.y = op(this.y, typeof v === "number" ? v : v.y);
    return this;
  }

  add(v: Vector | number): Vector {
    return this.apply((a, b) => a + b, v);
  }
  subtract(v: Vector | number): Vector {
    return this.apply((a, b) => a - b, v);
  }
  multiply(v: Vector | number): Vector {
    return this.apply((a, b) => a * b, v);
  }
  divide(v: Vector | number): Vector {
    return this.apply((a, b) => a / b, v);
  }

  floor(): Vector {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }

  equals(v: Vector) {
    return this.x === v.x && this.y === v.y;
  }

  hamming(v: Vector): number {
    const diff = this.minus(v);
    return Math.abs(diff.x) + Math.abs(diff.y);
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
