const { MessageType } = require("./messages.js");

const DIR_ENCODE = {
	0: {
		1: 0b00000,
		[-1]: 0b01000
	},
	1: { 0: 0b10000 },
	[-1]: { 0: 0b11000 }
};

const DIR_DECODE = {
	0b00000: [0, 1],
	0b01000: [0, -1],
	0b10000: [1, 0],
	0b11000: [-1, 0]
};

function getHoleMessage(border, counts, clickPos) {
	const start = border.pop();

	const directions = [];
	let prev, current;

	while (border.length > 0) {
		prev = current ?? start;
		current = border.pop();

		directions.push(
			DIR_ENCODE[current[0] - prev[0]][current[1] - prev[1]]
			+ counts[prev[1]][prev[0]]
		);
	}
	directions.push(counts[current[1]][current[0]]);

	return [MessageType.HOLE, clickPos[0], clickPos[1], start[0], start[1], directions];
}

function openHole(boardState, holeMessage) {
	const pos = [holeMessage.startX, holeMessage.startY];

	for (let direction of holeMessage.directions) {
		if (direction === 0) break;

		boardState[pos[1]][pos[0]] = direction & 0b111;

		const move = DIR_DECODE[direction & 0b11000];
		pos[0] += move[0];
		pos[1] += move[1];
	}

	const queue = [[holeMessage.clickX, holeMessage.clickY]];
	const visited = [];

	while (queue.length > 0) {
		const p = queue.pop();
		visited.push(p);

		const x = p[0];
		const y = p[1];

		if (boardState[y][x] === 9)
			boardState[y][x] = 0;

		const filtered = [...visited, ...queue];
		const mx = Math.min(x + 1, boardState[0].length - 1);
		const my = Math.min(y + 1, boardState.length - 1);
		for (let x_ = Math.max(x - 1, 0); x_ <= mx; x_++) {
			for (let y_ = Math.max(y - 1, 0); y_ <= my; y_++) {
				if (!filtered.some(p => p[0] === x_ && p[1] === y_) && boardState[y_][x_] === 9)
					queue.unshift([x_, y_]);
			}
		}
	}
}

module.exports = { getHoleMessage, openHole };