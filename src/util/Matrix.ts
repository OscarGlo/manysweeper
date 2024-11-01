import { Vector } from "./Vector";

export enum MatrixType {
  SQUARE,
  HEX,
  TRI,
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

  static copy<T>(m: Matrix<T>): Matrix<T> {
    return new Matrix(
      m.width,
      m.height,
      m.type,
      (p) => m.arr[p.y + p.x * m.height],
    );
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
    mousePos = new Vector(mousePos);

    if (this.type === MatrixType.HEX) {
      mousePos.y = mousePos.y / 0.875 - 0.1;
      if (mousePos.y % 2 >= 1) {
        mousePos.x -= 0.5;
      }
    }
    if (this.type === MatrixType.TRI) {
      mousePos.y /= 1.125;

      const fy = Math.floor(mousePos.y);
      const xOff = fy % 2 === 0 ? 1 : 0;

      const dy = mousePos.y - fy;
      mousePos.x = (mousePos.x / 0.69 - 0.7 * dy - xOff) / 2;

      const fx = Math.floor(mousePos.x);
      const dx = mousePos.x - fx;
      mousePos.x = fx * 2 + xOff;
      if (dy + dx > 1) mousePos.x += 1;
    }
    return mousePos.floor();
  }

  forEachCell(fn: (t: T, p: Vector) => void) {
    for (let i = 0; i < this.arr.length; i++) {
      fn(this.arr[i], this.getVec(i));
    }
  }

  adjacent(u: Vector, v: Vector): boolean {
    const sameRow = u.y === v.y && Math.abs(u.x - v.x) === 1;

    switch (this.type) {
      case MatrixType.SQUARE:
        return u.hamming(v) == 1;

      case MatrixType.HEX:
        return (
          Math.abs(u.y - v.y) <= 1 &&
          (sameRow ||
            (u.y % 2 === 0 && (v.x === u.x - 1 || v.x === u.x)) ||
            (u.y % 2 === 1 && (v.x === u.x || v.x === u.x + 1)))
        );

      case MatrixType.TRI:
        return (
          sameRow ||
          (v.x === u.x &&
            ((u.y % 2 === u.x % 2 && v.y === u.y + 1) ||
              (u.y % 2 !== u.x % 2 && v.y === u.y - 1)))
        );
    }
  }

  neighbour(u: Vector, v: Vector): boolean {
    switch (this.type) {
      case MatrixType.SQUARE:
        return u.euclidean(v) < 2;

      case MatrixType.HEX:
        return this.adjacent(u, v);

      case MatrixType.TRI: {
        const xOff = Math.abs(u.x - v.x);
        return (
          (u.y === v.y && xOff <= 2) ||
          (u.y % 2 === u.x % 2 &&
            ((v.y === u.y + 1 && xOff <= 2) ||
              (v.y === u.y - 1 && xOff <= 1))) ||
          (u.y % 2 !== u.x % 2 &&
            ((v.y === u.y + 1 && xOff <= 1) || (v.y === u.y - 1 && xOff <= 2)))
        );
      }
    }
  }

  forEachRange(
    pos: Vector,
    dx: number,
    dy: number,
    fn: (t: T | undefined, p: Vector) => void,
    keepOutOfBounds: boolean = false,
  ) {
    for (let x = pos.x - dx; x <= pos.x + dx; x++) {
      for (let y = pos.y - dy; y <= pos.y + dy; y++) {
        const p = new Vector(x, y);
        if (
          (x !== pos.x || y !== pos.y) &&
          (keepOutOfBounds || this.inBounds(p))
        )
          fn(this.get(p), p);
      }
    }
  }

  forEachAdjacent(
    pos: Vector,
    fn: (t: T | undefined, p: Vector) => void,
    keepOutOfBounds: boolean = false,
  ) {
    this.forEachRange(
      pos,
      1,
      1,
      (v, p) => {
        if (this.adjacent(pos, p)) fn(v, p);
      },
      keepOutOfBounds,
    );
  }

  forEachNeighbor(
    pos: Vector,
    fn: (t: T | undefined, p: Vector) => void,
    keepOutOfBounds: boolean = false,
  ) {
    this.forEachRange(
      pos,
      2,
      1,
      (v, p) => {
        if (this.neighbour(pos, p)) fn(v, p);
      },
      keepOutOfBounds,
    );
  }
}
