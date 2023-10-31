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
      ? value
      : typeof value === "function"
      ? new Array(width * height)
          .fill(0)
          .map((_, i) => (value as (p: Vector) => T)(this.getVec(i)))
      : new Array(width * height).fill(value);
  }

  getVec(i: number) {
    return new Vector(i % this.width, i / this.width);
  }

  getIndex(x: Vector | number, y?: number) {
    const X = y ? (x as number) : (x as Vector).x;
    const Y = y ? (y as number) : (x as Vector).y;
    return X + Y * this.width;
  }

  get(x: Vector | number, y?: number): T {
    return this.arr[this.getIndex(x, y)];
  }

  set(x: Vector | number, y: number | T, t?: T) {
    this.arr[this.getIndex(x, t ? (y as number) : undefined)] = t ?? (y as T);
  }

  copy(): Matrix<T> {
    return new Matrix<T>(this.width, this.height, this.get);
  }

  forEachCell(fn: (t: T, p: Vector) => void) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        fn(this.get(x, y), new Vector(x, y));
      }
    }
  }

  forEachNeighbor(
    pos: Vector,
    fn: (t: T | undefined, p: Vector) => void,
    keepOutOfBounds: boolean = false,
  ) {
    for (let x = pos.x - 1; x <= pos.x + 1; x++)
      for (let y = pos.y - 1; y <= pos.y + 1; y++)
        if (keepOutOfBounds || this.get(x, y) !== undefined)
          fn(this.get(x, y), new Vector(x, y));
  }
}
