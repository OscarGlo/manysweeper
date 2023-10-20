let id;

let boardState;
let mines;
let win;

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function loadImage(path) {
	const img = new Image();
	img.src = "img/" + path + ".png";
	return img;
}

const sprites = {
	cursor: loadImage("cursor"),
	tile: loadImage("tile"),
	block: loadImage("block"),
	flag: loadImage("flag"),
	mine: loadImage("mine"),
	mineHit: loadImage("mine_hit"),
	mineWrong: loadImage("mine_wrong"),
	numbers: [
		null,
		loadImage("number_1"),
		loadImage("number_2"),
		loadImage("number_3"),
		loadImage("number_4"),
		loadImage("number_5"),
		loadImage("number_6"),
		loadImage("number_7"),
		loadImage("number_8")
	]
};

let users = {};

const TILE_SIZE = 32;

function drawTile(x, y, texture) {
	ctx.drawImage(texture, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.imageSmoothingEnabled = false;
	for (let y = 0; y < boardState.length; y++) {
		let row = boardState[y];
		for (let x = 0; x < row.length; x++) {
			const n = row[x];

			const isMine = mines && mines[y][x];

			drawTile(x, y, n >= 0 || (isMine && n !== -2) ? sprites.tile : sprites.block);

			if (isMine && n !== -2) {
				drawTile(x, y, sprites.tile);
				drawTile(x, y, n === 0 ? sprites.mineHit : sprites.mine);
				continue;
			}

			if (n === -2)
				drawTile(x, y, isMine ? sprites.flag : sprites.mineWrong);
			else if (n > 0)
				drawTile(x, y, sprites.numbers[n]);
		}
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "hanging";
	ctx.font = "normal 13px monospace";
	ctx.imageSmoothingEnabled = true;

	const MARGIN = 3;
	Object.values(users)
		.filter((user) => user.pos != null)
		.forEach((user) => {
			ctx.drawImage(sprites.cursor, user.pos[0], user.pos[1]);

			if (user.username) {
				let displayName = user.username.length > 16 ? user.username.substring(0, 16) + "…" : user.username;

				const x = user.pos[0] + sprites.cursor.width * 2 / 3;
				const y = user.pos[1] + sprites.cursor.height + 6;

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
			boardState = data.boardState;
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