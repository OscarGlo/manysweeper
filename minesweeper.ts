export const WALL = 9;
export const FLAG = 10;

function shuffle(arr: any[]) {
	arr = [...arr];
	const len = arr.length;
	for (let i = 0; i < len; i++) {
		const j = Math.floor(Math.random() * len);
		[arr[j], arr[i]] = [arr[i], arr[j]];
	}
	return arr;
}

export function arrayFrom<T>(size: number, get: (i: number) => T): T[] {
	return new Array(size).fill(0).map((_, i) => get(i));
}

export function matrixFrom<T>(width, height, get: (x: number, y: number) => T): T[][] {
	return arrayFrom(height, (y) => arrayFrom(width, (x) => get(x, y)));
}

export function generateMines(width: number, height: number, mineCount: number): boolean[][] {
	const positions = arrayFrom(width * height, (i) =>
		[i % width, Math.floor(i / width)]
	);
	const mines = shuffle(positions).slice(0, mineCount);

	return matrixFrom(width, height, (x, y) =>
		mines.some((m) => m[0] === x && m[1] === y)
	);
}

function forEachNeighbor<T>(arr: T[][], pos: [number, number], cb: (t: T, x: number, y: number) => any) {
	const width = arr[0].length;
	const height = arr.length;

	const x = pos[0];
	const y = pos[1];

	const mx = Math.min(x + 1, width - 1);
	const my = Math.min(y + 1, height - 1);

	for (let x_ = Math.max(x - 1, 0); x_ <= mx; x_++)
		for (let y_ = Math.max(y - 1, 0); y_ <= my; y_++)
			cb(arr[y_][x_], x_, y_);
}

export function countNeighborMines(mines: boolean[][]): number[][] {
	const width = mines[0].length;
	const height = mines.length;

	return matrixFrom(width, height, (x, y) => {
		let count = 0;
		forEachNeighbor(mines, [x, y], (mine, x_, y_) => {
			if ((x_ != x || y_ != y) && mine)
				count++;
		});
		return count;
	});
}

export function moveFirstMine(mines: boolean[][], pos: [number, number]): boolean[][] {
	const x = pos[0];
	const y = pos[1];

	if (mines[y][x]) {
		const positions = [];
		for (let y_ in mines) {
			for (let x_ in mines[y_]) {
				if (!mines[y_][x_])
					positions.push([x_, y_]);
			}
		}
		const newPos = positions[Math.floor(Math.random() * positions.length)];
		mines[y][x] = false;
		mines[newPos[1]][newPos[0]] = true;
	}

	return mines;
}

function neighbor(a: [number, number], b: [number, number]): boolean {
	return (a[0] === b[0] && (a[1] === b[1] - 1 || a[1] === b[1] + 1))
		|| (a[1] === b[1] && (a[0] === b[0] - 1 || a[0] === b[0] + 1));
}

export function open(boardState: number[][], counts: number[][], pos: [number, number]): [number[][], [number, number][][]] {
	const queue = [pos];
	const visited = [];
	const borders = [];
	while (queue.length > 0) {
		const p = queue.pop();
		visited.push(p);

		const x = p[0];
		const y = p[1];

		const n = counts[y][x];
		boardState[y][x] = n;

		if (n > 0) {
			let added = false;
			for (const border of borders) {
				if (neighbor(p, border[0])) {
					border.unshift(p);
					added = true;
					break;
				}
				if (border.length > 1 && neighbor(p, border[border.length - 1])) {
					border.push(p);
					added = true;
					break;
				}
			}
			if (!added) borders.push([p]);
			continue;
		}

		const filtered = [...visited, ...queue];
		forEachNeighbor(boardState, [x, y], (_, x_, y_) => {
			if (!filtered.some(p => p[0] === x_ && p[1] === y_))
				queue.unshift([x_, y_]);
		});
	}

	for (let cur = 0; cur < borders.length; cur++) {
		const border = borders[cur];

		for (let i = cur + 1; i < borders.length; i++) {
			const toAdd = borders[i];

			let added = false;
			if (neighbor(border[0], toAdd[0])) {
				border.unshift(...toAdd.reverse());
				added = true;
			} else if (neighbor(border[0], toAdd[toAdd.length - 1])) {
				border.unshift(...toAdd);
				added = true;
			} else if (neighbor(border[border.length - 1], toAdd[0])) {
				border.push(...toAdd);
				added = true;
			} else if (neighbor(border[border.length - 1], toAdd[toAdd.length - 1])) {
				border.push(...toAdd.reverse());
				added = true;
			}


			if (added) {
				borders.splice(i, 1);
				i = cur;
			}
		}
	}

	return [boardState, borders];
}

export function chord(boardState: number[][], mines: boolean[][], counts: number[][], pos: any): [number[][], boolean, [number, number][][]] {
	const x = pos[0];
	const y = pos[1];

	let flagCount = 0;
	forEachNeighbor(boardState, [x, y], (s) => {
		if (s === FLAG) flagCount++;
	});
	let borders = [];
	if (flagCount === counts[y][x]) {
		// Check for mines
		let failed = false;
		forEachNeighbor(boardState, [x, y], (s, x_, y_) => {
			if (s === WALL && mines[y_][x_])
				failed = true;
		});
		if (failed) {
			forEachNeighbor(boardState, [x, y], (s, x_, y_) => {
				if (s === WALL) boardState[y_][x_] = 0;
			});
			return [boardState, true, []];
		}

		forEachNeighbor(boardState, [x, y], (s, x_, y_) => {
			if (s === WALL) {
				let tileBorders;
				[boardState, tileBorders] = open(boardState, counts, [x_, y_]);
				borders.push(...tileBorders);
			} else {
				borders.push([[x_, y_]]);
			}
		});
	}
	// TODO: Check for same borders
	return [boardState, false, borders];
}

export function checkWin(boardState: number[][], mines: boolean[][]): boolean {
	for (let y in boardState) {
		const row = boardState[y];
		for (let x in row) {
			if (!mines[y][x] && row[x] > 8)
				return false;
		}
	}
	return true;
}
