let id;

let boardState;
let mines;
let win;

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const cursorImage = new Image();
cursorImage.src = "img/cursor.png";

let users = {};

const TILE_SIZE = 30;

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 20px monospace";

	for (let y = 0; y < boardState.length; y++) {
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
			ctx.fillStyle = n >= 0 ? "#888888" : (win ? "#aaffaa" : "#aaaaaa");
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

	ctx.textBaseline = "hanging";
	ctx.font = "normal 13px monospace";

	const MARGIN = 3;
	Object.values(users)
		.filter((user) => user.pos != null)
		.forEach((user) => {
			ctx.drawImage(cursorImage, user.pos[0], user.pos[1]);

			if (user.username) {
				let displayName = user.username.length > 16 ? user.username.substring(0, 16) + "…" : user.username;

				const x = user.pos[0] + cursorImage.width * 2 / 3;
				const y = user.pos[1] + cursorImage.height + 6;

				const metrics = ctx.measureText(displayName);
				const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
				ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
				ctx.fillRect(x - metrics.width / 2 - MARGIN, y - MARGIN, metrics.width + MARGIN * 2, height + MARGIN * 2);

				ctx.fillStyle = "white";
				ctx.fillText(displayName, x, y);
			}
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

let ws = new WebSocket("wss://" + location.host);

function send(data) {
	if (ws.readyState === WebSocket.OPEN)
		ws.send(JSON.stringify(data));
}

const sendPos = throttled((...pos) => {
	if (ws.readyState === WebSocket.OPEN)
		send({ type: "cursor", pos });
}, 20);

canvas.addEventListener("mousemove", (evt) => {
	sendPos(evt.clientX, evt.clientY);
});

canvas.addEventListener("mousedown", (evt) => {
	const button = evt.button;

	if (button === 0 || button === 2) {
		const x = Math.floor(evt.clientX / TILE_SIZE);
		const y = Math.floor(evt.clientY / TILE_SIZE);

		if (x >= 0 && x < boardState[0].length && y >= 0 && y < boardState.length)
			send({ type: button === 0 ? "click" : "flag", pos: [x, y] });

		evt.preventDefault();
	}
});

canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());

const resetButton = document.getElementById("reset");
resetButton.addEventListener("click", () => send({ type: "reset" }));

function messageListener(evt) {
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
			users = data.users;
			break;

		case "reset":
			win = false;
			resetButton.disabled = true;
			mines = undefined;
		case "board":
			boardState = data.boardState;
			draw();
			break;

		case "fail":
			mines = data.mines;
			draw();
			resetButton.disabled = false;
			break;

		case "win":
			win = true;
			boardState = data.boardState;
			draw();
			resetButton.disabled = false;
			break;

		case "connect":
			if (!users[data.id])
				users[data.id] = {};
			users[data.id].username = data.username;
			break;

		case "cursor":
			if (!users[data.id])
				users[data.id] = {};
			users[data.id].pos = data.pos;
			draw();
			break;

		case "disconnect":
			delete users[data.id];
			draw();
			break;
	}
}

ws.addEventListener("message", messageListener);

ws.addEventListener("error", (evt) => {
	evt.preventDefault();

	ws = new WebSocket("ws://" + location.host);
	ws.addEventListener("message", messageListener);
});