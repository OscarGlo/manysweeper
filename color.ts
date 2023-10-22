export function hex2rgb(hex: string): [number, number, number] {
	if (hex.startsWith("#"))
		hex = hex.substring(1);

	return hex.length === 3 ?
		[
			parseInt(hex[0], 16) / 15,
			parseInt(hex[1], 16) / 15,
			parseInt(hex[2], 16) / 15,
		] :
		[
			parseInt(hex.substring(0, 2), 16) / 255,
			parseInt(hex.substring(2, 4), 16) / 255,
			parseInt(hex.substring(4, 6), 16) / 255,
		];
}

export function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
	let cmin = Math.min(r, g, b);
	let cmax = Math.max(r, g, b);
	let delta = cmax - cmin;

	let h: number;
	let s: number;
	let l: number;

	if (delta == 0) h = 0;
	else if (cmax == r) h = ((g - b) / delta) % 6;
	else if (cmax == g) h = (b - r) / delta + 2;
	else h = (r - g) / delta + 4;

	h = Math.round(h * 60);

	if (h < 0)
		h += 360;

	l = (cmax + cmin) / 2;

	s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

	return [h, s * 100, l * 100];
}