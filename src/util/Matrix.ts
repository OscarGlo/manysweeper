import { Vector } from "./Vector";

export enum MatrixType {
  SQUARE,
  HEX,
}

export class Matrix<T> {
  width: number;
  height: number;
  type: MatrixType;
  arr: Array<T>;

  constructor(
    width: number,
    height: number,
    type: MatrixType,
    value?: T | T[] | ((p: Vector) => T),
  ) {
    this.width = width;
    this.height = height;
    this.type = type;

    this.arr = Array.isArray(value)
      ? value.slice(0, width * height)
      : typeof value === "function"
        ? new Array(width * height)
            .fill(0)
            .map((_, i) => (value as (p: Vector) => T)(this.getVec(i)))
        : new Array(width * height).fill(value);
  }

  getVec(i: number) {
    return new Vector(Math.floor(i / this.height), i % this.height);
  }

  inBounds(x: Vector | number, y?: number) {
    const X = y != null ? (x as number) : (x as Vector).x;
    const Y = y != null ? (y as number) : (x as Vector).y;

    return X >= 0 && X < this.width && Y >= 0 && Y < this.height;
  }

  getIndex(x: Vector | number, y?: number) {
    const X = y != null ? (x as number) : (x as Vector).x;
    const Y = y != null ? (y as number) : (x as Vector).y;

    if (!this.inBounds(X, Y)) return -1;
    return Y + X * this.height;
  }

  get(x: Vector | number, y?: number): T | undefined {
    return this.arr[this.getIndex(x, y)];
  }

  set(x: Vector | number, y: number | T, t?: T) {
    this.arr[this.getIndex(x, t != null ? (y as number) : undefined)] =
      t ?? (y as T);
  }

  getTilePos(mousePos: Vector) {
    if (this.type === MatrixType.HEX) {
      mousePos.y /= 0.875;
      if (mousePos.y % 2 >= 1) {
        mousePos.x -= 0.5;
      }
    }
    return mousePos.floor();
  }

  forEachCell(fn: (t: T, p: Vector) => void) {
    for (let i = 0; i < this.arr.length; i++) {
      fn(this.arr[i], this.getVec(i));
    }
  }

  adjacent(u: Vector, v: Vector): boolean {
    switch (this.type) {
      case MatrixType.SQUARE:
        return u.hamming(v) == 1;

      case MatrixType.HEX:
        return (
          Math.abs(u.y - v.y) <= 1 &&
          ((u.y === v.y && Math.abs(u.x - v.x) === 1) ||
            (u.y % 2 === 0 && (v.x === u.x - 1 || v.x === u.x)) ||
            (u.y % 2 === 1 && (v.x === u.x || v.x === u.x + 1)))
        );
    }
  }

  neighbour(u: Vector, v: Vector): boolean {
    switch (this.type) {
      case MatrixType.SQUARE:
        return u.euclidean(v) < 2;

      case MatrixType.HEX:
        return this.adjacent(u, v);
    }
  }

  forEachNeighbor(
    pos: Vector,
    fn: (t: T | undefined, p: Vector) => void,
    keepOutOfBounds: boolean = false,
  ) {
    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
      for (let y = pos.y - 1; y <= pos.y + 1; y++) {
        const p2 = new Vector(x, y);
        if (
          (x !== pos.x || y !== pos.y) &&
          (keepOutOfBounds || this.inBounds(x, y)) &&
          this.neighbour(pos, p2)
        )
          fn(this.get(x, y), p2);
      }
    }
  }
}
