function hue2rgb(p: number, q: number, t: number): number {
  while (t < 0) t += 1;
  while (t > 1) t -= 1;

  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;

  return p;
}

function rgb2hex(a: number): string {
  return Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");
}

export class Color {
  private _r: number;
  private _g: number;
  private _b: number;

  private _hex: string;

  private _h: number;
  private _s: number;
  private _l: number;

  static RED = Color.rgb(1, 0, 0);

  static rgb(r: number, g: number, b: number) {
    const color = new Color();
    color._r = r;
    color._g = g;
    color._b = b;
    return color;
  }

  static hsl(h: number, s: number, l: number) {
    const color = new Color();
    color._h = h;
    color._s = s / 100;
    color._l = l / 100;
    return color;
  }

  static hex(hex: string) {
    if (hex.startsWith("#")) hex = hex.substring(1);

    const color =
      hex.length === 3
        ? Color.rgb(
            parseInt(hex[0], 16) / 15,
            parseInt(hex[1], 16) / 15,
            parseInt(hex[2], 16) / 15,
          )
        : Color.rgb(
            parseInt(hex.substring(0, 2), 16) / 255,
            parseInt(hex.substring(2, 4), 16) / 255,
            parseInt(hex.substring(4, 6), 16) / 255,
          );

    color._hex = "#" + hex.toUpperCase();

    return color;
  }

  get hex(): string {
    if (this._hex == null)
      this._hex = "#" + rgb2hex(this.r) + rgb2hex(this.g) + rgb2hex(this.b);

    return this._hex;
  }

  get rgb(): { r: number; g: number; b: number } {
    if (this._r == null) {
      if (this._s === 0) {
        this._r = this._g = this._b = this._l;
      } else {
        const q =
          this._l < 0.5
            ? this._l * (1 + this._s)
            : this._l + this._s - this._l * this._s;
        const p = 2 * this._l - q;
        this._r = hue2rgb(p, q, this._h / 360 + 1 / 3);
        this._g = hue2rgb(p, q, this._h / 360);
        this._b = hue2rgb(p, q, this._h / 360 - 1 / 3);
      }
    }

    return {
      r: this._r,
      g: this._g,
      b: this._b,
    };
  }

  get r(): number {
    return this.rgb.r;
  }
  get g(): number {
    return this.rgb.g;
  }
  get b(): number {
    return this.rgb.b;
  }

  get hsl(): { h: number; s: number; l: number } {
    if (this._h == null) {
      const cmin = Math.min(this.r, this.g, this.b);
      const cmax = Math.max(this.r, this.g, this.b);
      const delta = cmax - cmin;

      let h: number;

      if (delta == 0) h = 0;
      else if (cmax == this.r) h = ((this.g - this.b) / delta) % 6;
      else if (cmax == this.g) h = (this.b - this.r) / delta + 2;
      else h = (this.r - this.g) / delta + 4;

      this._h = Math.round(h * 60);

      if (h < 0) this._h += 360;

      this._l = (cmax + cmin) / 2;
      this._s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * this._l - 1));
    }

    return {
      h: this._h,
      s: this._s * 100,
      l: this._l * 100,
    };
  }

  get h(): number {
    return this.hsl.h;
  }
  get s(): number {
    return this.hsl.s;
  }
  get l(): number {
    return this.hsl.l;
  }
}
