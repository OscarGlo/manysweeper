import { Vector } from "./Vector";

export class Position {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;

  constructor(values: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  }) {
    this.left = values.left;
    this.right = values.right;
    this.top = values.top;
    this.bottom = values.bottom;
  }

  offset(outer: Vector, inner: Vector): Vector {
    return new Vector(
      this.left
        ? this.left
        : this.right
          ? outer.x - (inner.x + this.right)
          : outer.x / 2 - inner.x / 2,
      this.top
        ? this.top
        : this.bottom
          ? outer.y - (inner.y + this.bottom)
          : outer.y / 2 - inner.y / 2,
    );
  }
}
