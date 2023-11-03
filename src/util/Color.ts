export class Color {
  r: number;
  g: number;
  b: number;

  private _hex: string;

  private _h: number;
  private _s: number;
  private _l: number;

  static RED = Color.rgb(1, 0, 0);

  static rgb(r: number, g: number, b: number) {
    const color = new Color();
    color.r = r;
    color.g = g;
    color.b = b;
    return color;
  }

  static hsl(h: number, s: number, l: number) {
    const color = new Color();
    color._h = h;
    color._s = s;
    color._l = l;
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
      this._hex =
        "#" +
        (this.r * 255).toString(16).padStart(2, "0") +
        (this.g * 255).toString(16).padStart(2, "0") +
        (this.b * 255).toString(16).padStart(2, "0");
    return this._hex;
  }

  // TODO rgb from hsl

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
