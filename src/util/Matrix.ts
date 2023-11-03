import { Vector } from "./Vector";

export class Matrix<T> {
  width: number;
  height: number;
  arr: Array<T>;

  constructor(
    width: number,
    height: number,
    value?: T | T[] | ((p: Vector) => T),
  ) {
    this.width = width;
    this.height = height;

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

  forEachCell(fn: (t: T, p: Vector) => void) {
    for (let i = 0; i < this.arr.length; i++) {
      fn(this.arr[i], this.getVec(i));
    }
  }

  forEachNeighbor(
    pos: Vector,
    fn: (t: T | undefined, p: Vector) => void,
    keepOutOfBounds: boolean = false,
  ) {
    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
      for (let y = pos.y - 1; y <= pos.y + 1; y++) {
        if (
          (x !== pos.x || y !== pos.y) &&
          (keepOutOfBounds || this.inBounds(x, y))
        )
          fn(this.get(x, y), new Vector(x, y));
      }
    }
  }
}
