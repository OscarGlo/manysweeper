const ws = new WebSocket("ws://" + location.host);

let id;

let boardState;
let mines;

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const cursorImage = new Image();
cursorImage.src = "img/cursor.png";

const cursors = {};

const TILE_SIZE = 30;

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (let y = 0; y < boardState.length; y++) {
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "bold 20px monospace";

		let row = boardState[y];
		for (let x = 0; x < row.length; x++) {
			const tx = x * TILE_SIZE;
			const cx = (x + 0.5) * TILE_SIZE;
			const ty = y * TILE_SIZE;
			const cy = (y + 0.5) * TILE_SIZE;

			if (mines && mines[y][x]) {
				ctx.fillStyle = "#ff4444";
				ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

				ctx.fillStyle = "black";
				ctx.beginPath();
				ctx.ellipse(cx, cy, 10, 10, 0, 0, 2 * Math.PI);
				ctx.fill();
				continue;
			}

			const n = row[x];
			ctx.fillStyle = n >= 0 ? "#888" : "#aaa";
			ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

			// Flag
			if (n === -2) {
				ctx.fillStyle = "#ff4444";
				ctx.beginPath();
				ctx.moveTo(cx - 7, cy - 8);
				ctx.lineTo(cx - 7, cy + 8);
				ctx.lineTo(cx + 9, cy);
				ctx.closePath();
				ctx.fill();
			}

			// Number
			if (n > 0) {
				ctx.fillStyle = `hsl(${100 + n * 40}, 60%, 50%)`;
				ctx.fillText(n, (x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE);
			}
		}
	}

	Object.values(cursors).forEach((pos) => {
		ctx.drawImage(cursorImage, pos[0], pos[1]);
	});
}

function throttled(cb, delay) {
	let timeout, nextArgs;

	return (...args) => {
		if (timeout) {
			nextArgs = args;
		} else {
			cb(...args);

			timeout = setTimeout(() => {
				if (nextArgs) {
					cb(...nextArgs);
					nextArgs = undefined;
				}
				timeout = undefined;
			}, delay);
		}
	};
}

const sendPos = throttled((...pos) => ws.send(JSON.stringify({ type: "cursor", pos })), 20);

canvas.addEventListener("mousemove", (evt) => {
	sendPos(evt.clientX, evt.clientY);
});

canvas.addEventListener("mousedown", (evt) => {
	const button = evt.button;

	if (button === 0 || button === 2) {
		const x = Math.floor(evt.clientX / TILE_SIZE);
		const y = Math.floor(evt.clientY / TILE_SIZE);

		if (x >= 0 && x < boardState[0].length && y >= 0 && y < boardState.length)
			ws.send(JSON.stringify({ type: button === 0 ? "click" : "flag", pos: [x, y] }));

		evt.preventDefault();
	}
});

canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());

ws.addEventListener("message", (evt) => {
	let data;
	try {
		data = JSON.parse(evt.data);
	} catch (e) {
		console.warn(`Non JSON data received: ${evt.data}`);
	}

	if (data == null || data.type == null) {
		console.warn(`Invalid JSON data received: ${evt.data}`);
		return;
	}

	// noinspection FallThroughInSwitchStatementJS
	switch (data.type) {
		case "init":
			id = data.id;
			console.log("Initialized with id", id);
			break;

		case "reset":
			mines = undefined;
		case "board":
			boardState = data.boardState;
			draw();
			break;

		case "fail":
			mines = data.mines;
			draw();
			break;

		case "cursor":
			cursors[data.id] = data.pos;
			draw();
			break;

		case "disconnect":
			delete cursors[data.id];
			draw();
			break;
	}
});

