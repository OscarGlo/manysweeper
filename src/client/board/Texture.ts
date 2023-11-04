import { Vector } from "../../util/Vector";

export class Texture {
  img: HTMLImageElement;

  constructor(src: string) {
    this.img = new Image();
    this.img.src = src;
  }
}

export class AtlasTexture extends Texture {
  rows: number;
  cols: number;
  tileSize: Vector;

  constructor(src: string, rows: number, cols: number) {
    super(src);
    this.rows = rows;
    this.cols = cols;

    this.img.addEventListener("load", () => {
      this.tileSize = new Vector(
        this.img.width / this.cols,
        this.img.height / this.rows,
      );
    });
  }

  drawTile(
    ctx: CanvasRenderingContext2D,
    tile: Vector,
    pos: Vector,
    size: Vector,
  ) {
    ctx.drawImage(
      this.img,
      tile.x * this.tileSize.x,
      tile.y * this.tileSize.y,
      this.tileSize.x,
      this.tileSize.y,
      pos.x,
      pos.y,
      size.x ?? this.tileSize.x,
      size.y ?? this.tileSize.y,
    );
  }
}

export class NineSliceTexture extends Texture {
  top: number;
  bottom: number;
  left: number;
  right: number;

  width: number;
  height: number;

  centerWidth: number;
  centerHeight: number;

  constructor(
    src: string,
    top: number,
    bottom: number,
    left: number,
    right: number,
  ) {
    super(src);
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;

    this.img.addEventListener("load", () => {
      this.width = this.img.width;
      this.height = this.img.height;

      this.centerWidth = this.width - right - left;
      this.centerHeight = this.height - top - bottom;
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    pos: Vector,
    size: Vector,
    scale: number = 1,
  ) {
    const cw = size.x - (this.left + this.right) * scale;
    const ch = size.y - (this.top + this.bottom) * scale;

    // Top left
    ctx.drawImage(
      this.img,
      0,
      0,
      this.left,
      this.top,
      pos.x,
      pos.y,
      this.left * scale,
      this.top * scale,
    );
    // Top
    ctx.drawImage(
      this.img,
      this.left,
      0,
      this.centerWidth,
      this.top,
      pos.x + this.left * scale,
      pos.y,
      cw,
      this.top * scale,
    );
    // Top right
    ctx.drawImage(
      this.img,
      this.width - this.right,
      0,
      this.right,
      this.top,
      pos.x + cw + this.left * scale,
      pos.y,
      this.right * scale,
      this.top * scale,
    );

    // Left
    ctx.drawImage(
      this.img,
      0,
      this.top,
      this.left,
      this.centerHeight,
      pos.x,
      pos.y + this.top * scale,
      this.left * scale,
      ch,
    );
    // Center
    ctx.drawImage(
      this.img,
      this.left,
      this.top,
      this.centerWidth,
      this.centerHeight,
      pos.x + this.left * scale,
      pos.y + this.top * scale,
      cw,
      ch,
    );
    // Right
    ctx.drawImage(
      this.img,
      this.width - this.right,
      this.top,
      this.right,
      this.centerHeight,
      pos.x + size.x - this.right * scale,
      pos.y + this.top * scale,
      this.right * scale,
      ch,
    );

    // Bottom left
    ctx.drawImage(
      this.img,
      0,
      this.height - this.bottom,
      this.left,
      this.bottom,
      pos.x,
      pos.y + size.y - this.bottom * scale,
      this.left * scale,
      this.bottom * scale,
    );
    // Bottom
    ctx.drawImage(
      this.img,
      this.left,
      this.height - this.bottom,
      this.centerWidth,
      this.bottom,
      pos.x + this.left * scale,
      pos.y + size.y - this.bottom * scale,
      cw,
      this.bottom * scale,
    );
    // Bottom right
    ctx.drawImage(
      this.img,
      this.width - this.right,
      this.height - this.bottom,
      this.right,
      this.bottom,
      pos.x + size.x - this.right * scale,
      pos.y + size.y - this.bottom * scale,
      this.right * scale,
      this.bottom * scale,
    );
  }
}
