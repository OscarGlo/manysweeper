const { deserializeMessage, formatMessageData, MessageType, serializeMessage } = require("/lib/messages.js");

let id;

let boardState = [[]];
let boardWidth = 0;
let boardHeight = 0;
let mineCount = 0;
let time = 0;
let mines;
let flags;
let win;

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let loadingCount = 0;

function loadImage(path) {
	loadingCount++;
	const img = new Image();
	img.src = "img/" + path + ".png";
	img.addEventListener("load", () => {
		loadingCount--;
		if (loadingCount === 0) {
			draw();
			updateBoardSize(true);
		}
	});
	return img;
}

const sprites = {
	cursor: loadImage("cursor"),
	tile: loadImage("board/tile"),
	block: loadImage("board/block"),
	flag: loadImage("board/flag"),
	mine: loadImage("board/mine"),
	mineHit: loadImage("board/mine_hit"),
	mineWrong: loadImage("board/mine_wrong"),
	numbers: [
		null,
		loadImage("board/number_1"),
		loadImage("board/number_2"),
		loadImage("board/number_3"),
		loadImage("board/number_4"),
		loadImage("board/number_5"),
		loadImage("board/number_6"),
		loadImage("board/number_7"),
		loadImage("board/number_8")
	],
	frame: {
		topLeft: loadImage("frame/top_left"),
		top: loadImage("frame/top"),
		topRight: loadImage("frame/top_right"),
		left: loadImage("frame/left"),
		right: loadImage("frame/right"),
		bottomLeft: loadImage("frame/bottom_left"),
		bottom: loadImage("frame/bottom"),
		bottomRight: loadImage("frame/bottom_right")
	},
	counter: {
		left: loadImage("gui/counter_left"),
		middle: loadImage("gui/counter_middle"),
		right: loadImage("gui/counter_right"),
		numbers: {
			0: loadImage("gui/number_0"),
			1: loadImage("gui/number_1"),
			2: loadImage("gui/number_2"),
			3: loadImage("gui/number_3"),
			4: loadImage("gui/number_4"),
			5: loadImage("gui/number_5"),
			6: loadImage("gui/number_6"),
			7: loadImage("gui/number_7"),
			8: loadImage("gui/number_8"),
			9: loadImage("gui/number_9"),
			"-": loadImage("gui/number_minus")
		}
	},
	button: {
		normal: loadImage("gui/button"),
		win: loadImage("gui/button_win"),
		fail: loadImage("gui/button_fail")
	}
};

let users = {};

const GUI_SCALE = 2;
const TILE_SIZE = 32;

function drawTile(x, y, texture) {
	ctx.drawImage(
		texture,
		x * TILE_SIZE + sprites.frame.left.width * GUI_SCALE,
		y * TILE_SIZE + sprites.frame.top.height * GUI_SCALE,
		TILE_SIZE, TILE_SIZE
	);
}

function counterWidth(length) {
	return (sprites.counter.left.width + length * sprites.counter.numbers[0].width + sprites.counter.right.width) * GUI_SCALE;
}

function drawCounter(x, y, value, length) {
	value = value.toString();
	if (length) {
		value = value.substring(0, length);

		while (value.length < length) {
			if (value.startsWith("-"))
				value = "-0" + value.substring(1);
			else
				value = "0" + value;
		}
	}
	const width = value.length * sprites.counter.numbers[0].width * GUI_SCALE;

	ctx.drawImage(sprites.counter.left, x, y, sprites.counter.left.width * GUI_SCALE, sprites.counter.left.height * GUI_SCALE);
	ctx.drawImage(sprites.counter.middle, x + sprites.counter.left.width * GUI_SCALE, y, width, sprites.counter.middle.height * GUI_SCALE);
	ctx.drawImage(sprites.counter.right, x + sprites.counter.left.width * GUI_SCALE + width, y, sprites.counter.right.width * GUI_SCALE, sprites.counter.right.height * GUI_SCALE);

	const yoff = (sprites.counter.left.height - sprites.counter.numbers[0].height);

	for (let i = 0; i < value.length; i++) {
		const n = value[i];
		const sprite = sprites.counter.numbers[n];
		ctx.drawImage(sprite, x + (sprites.counter.left.width + i * sprite.width) * GUI_SCALE, y + yoff, sprite.width * GUI_SCALE, sprite.height * GUI_SCALE);
	}
}

function buttonPosSize() {
	return [
		sprites.frame.left.width * GUI_SCALE + (boardWidth - sprites.button.normal.width * GUI_SCALE) / 2,
		30,
		sprites.button.normal.width * GUI_SCALE,
		sprites.button.normal.height * GUI_SCALE
	];
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.imageSmoothingEnabled = false;

	// Frame
	ctx.drawImage(sprites.frame.topLeft, 0, 0, sprites.frame.left.width * GUI_SCALE, sprites.frame.top.height * GUI_SCALE);
	ctx.drawImage(sprites.frame.top, sprites.frame.left.width * GUI_SCALE, 0, boardWidth, sprites.frame.topLeft.height * GUI_SCALE);
	ctx.drawImage(sprites.frame.topRight, sprites.frame.left.width * GUI_SCALE + boardWidth, 0, sprites.frame.right.width * GUI_SCALE, sprites.frame.top.height * GUI_SCALE);

	ctx.drawImage(sprites.frame.left, 0, sprites.frame.top.height * GUI_SCALE, sprites.frame.left.width * GUI_SCALE, boardHeight);
	ctx.drawImage(sprites.frame.right, sprites.frame.left.width * GUI_SCALE + boardWidth, sprites.frame.top.height * GUI_SCALE, sprites.frame.right.width * GUI_SCALE, boardHeight);

	ctx.drawImage(sprites.frame.bottomLeft, 0, sprites.frame.top.height * GUI_SCALE + boardHeight, sprites.frame.left.width * GUI_SCALE, sprites.frame.bottom.height * GUI_SCALE);
	ctx.drawImage(sprites.frame.bottom, sprites.frame.left.width * GUI_SCALE, sprites.frame.top.height * GUI_SCALE + boardHeight, boardWidth, sprites.frame.bottom.height * GUI_SCALE);
	ctx.drawImage(sprites.frame.bottomRight, sprites.frame.left.width * GUI_SCALE + boardWidth, sprites.frame.top.height * GUI_SCALE + boardHeight, sprites.frame.right.width * GUI_SCALE, sprites.frame.bottom.height * GUI_SCALE);

	// GUI
	const flagCount = boardState.flat().reduce((acc, s) => acc + (s === 10), 0);
	drawCounter(32, 30, mineCount - flagCount, 3);

	ctx.drawImage(win ? sprites.button.win : mines ? sprites.button.fail : sprites.button.normal, ...buttonPosSize());

	drawCounter(canvas.width - 28 - counterWidth(3), 30, time, 3);

	// Board
	for (let y = 0; y < boardState.length; y++) {
		let row = boardState[y];
		for (let x = 0; x < row.length; x++) {
			const n = row[x];

			const isMine = mines && mines[y][x];

			drawTile(x, y, n < 8 || (isMine && n !== 10) ? sprites.tile : sprites.block);

			if (isMine && n !== 10) {
				drawTile(x, y, sprites.tile);
				drawTile(x, y, n === 0 ? sprites.mineHit : sprites.mine);
				continue;
			}

			if (n === 10)
				if (!mines || isMine) {
					const flagUser = users[flags[y][x]];
					if (flagUser) {
						const color = flagUser.color;
						const brightness = Math.floor(color[2] * 2 + Math.max(color[2] - 50, 0) * 6);
						ctx.filter = `hue-rotate(${color[0]}deg) saturate(${Math.floor(color[1])}%) brightness(${brightness}%)`;
					}
					drawTile(x, y, sprites.flag);
					ctx.filter = "none";
				} else {
					drawTile(x, y, sprites.mineWrong);
				}
			else if (n > 0 && n <= 8)
				drawTile(x, y, sprites.numbers[n]);
		}
	}

	// Cursors
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

const CURSOR_SMOOTHING = 0.5;

setInterval(() => {
	Object.values(users)
		.forEach((user) => {
			if (user.pos && user.nextPos)
				user.pos = [
					CURSOR_SMOOTHING * user.pos[0] + (1 - CURSOR_SMOOTHING) * user.nextPos[0],
					CURSOR_SMOOTHING * user.pos[1] + (1 - CURSOR_SMOOTHING) * user.nextPos[1]
				];
		});
	draw();
}, 1000 / 60);

let ws = new WebSocket("wss://" + location.host);

function send(data) {
	if (ws.readyState === WebSocket.OPEN)
		ws.send(serializeMessage(data));
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

const sendPos = throttled((...pos) => {
	if (ws.readyState === WebSocket.OPEN) {
		const x = Math.floor(pos[0]);
		const y = Math.floor(pos[1]);

		send([MessageType.CURSOR, id, x, y]);
	}
}, 50)

canvas.addEventListener("mousemove", (evt) => {
	sendPos(...getMousePos(evt));
});

function getMousePos(evt) {
	const rect = canvas.getBoundingClientRect();
	return [evt.clientX - rect.left, evt.clientY - rect.top];
}

canvas.addEventListener("mousedown", (evt) => {
	let [x, y] = getMousePos(evt);
	const button = evt.button;

	const reset = buttonPosSize();

	if (button === 0 && x >= reset[0] && y >= reset[1] && x <= reset[0] + reset[2] && y <= reset[1] + reset[3]) {
		send([MessageType.RESET]);
	} else if (button === 0 || button === 1 || button === 2) {
		x = Math.floor((x - sprites.frame.left.width * GUI_SCALE) / TILE_SIZE);
		y = Math.floor((y - sprites.frame.top.height * GUI_SCALE) / TILE_SIZE);

		if (x >= 0 && x < boardState[0].length && y >= 0 && y < boardState.length)
			send([button === 0 ? MessageType.TILE : button === 1 ? MessageType.CHORD : MessageType.FLAG, x, y]);

		evt.preventDefault();
	}
});

canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());

function updateBoardSize(redraw = false) {
	boardWidth = boardState[0].length * TILE_SIZE;
	boardHeight = boardState.length * TILE_SIZE;

	let change = false;
	if (canvas.width !== boardState[0].length) {
		change = true;
		canvas.width = boardWidth + (sprites.frame.left.width + sprites.frame.right.width) * GUI_SCALE;
	}
	if (canvas.height !== boardState.length) {
		change = true;
		canvas.height = boardHeight + (sprites.frame.top.height + sprites.frame.bottom.height) * GUI_SCALE;
	}
	if (change && redraw) draw();
}

function unflatten(arr) {
	return new Array(16).fill(0).map((_, i) => arr.slice(i * 30, (i + 1) * 30));
}

async function messageListener(evt) {
	const buf = await evt.data.arrayBuffer();
	const msg = formatMessageData(deserializeMessage(new Uint8Array(buf)));

	switch (msg.type) {
		case MessageType.INIT:
			id = msg.id;
			mineCount = msg.mineCount;
			flags = unflatten(msg.flags);
			break;

		case MessageType.USER:
			users[msg.id] = {
				id: msg.id,
				color: [msg.hue, msg.saturation, msg.lightness],
				username: msg.username.substring(0, msg.usernameLength)
			}
			break;

		case MessageType.DISCONNECT:
			delete users[msg.id];
			for (let y = 0; y < boardState.length; y++) {
				for (let x = 0; x < boardState[0].length; x++) {
					if (boardState[y][x] === msg.id)
						boardState[y][x] = 0;
				}
			}
			break;

		case MessageType.CURSOR:
			const user = users[msg.id];
			if (user) {
				const pos = [msg.x, msg.y];

				if (!user.pos) user.pos = pos;
				else user.nextPos = pos;
			}
			break;

		case MessageType.TIMER:
			time = msg.time;
			break;

		case MessageType.TICK:
			time++;
			break;

		// case MessageType.TILE:
		// 	break;

		// case MessageType.CHORD:
		// 	break;

		case MessageType.BOARD:
			boardState = unflatten(msg.tiles);
			updateBoardSize();
			break;

		case MessageType.FLAG:
			flags[msg.y][msg.x] = msg.id;
			boardState[msg.y][msg.x] = boardState[msg.y][msg.x] === 9 ? 10 : 9;
			break;

		case MessageType.WIN:
			win = true;
			break;

		case MessageType.LOSE:
			mines = unflatten(msg.mines.map(m => !!m));
			break;

		case MessageType.RESET:
			mineCount = msg.mineCount;
			for (let y = 0; y < boardState.length; y++) {
				for (let x = 0; x < boardState[0].length; x++) {
					boardState[y][x] = 9;
				}
			}
			time = 0;
			mines = undefined;
			win = false;
			break;
	}

	draw();
}

ws.addEventListener("message", messageListener);

ws.addEventListener("error", (evt) => {
	evt.preventDefault();

	ws = new WebSocket("ws://" + location.host);
	ws.addEventListener("message", messageListener);
});