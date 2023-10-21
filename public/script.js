let id;

let boardState;
let boardWidth = 0;
let boardHeight = 0;
let mineCount = 0;
let timer = 0;
let mines;
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
	const flagCount = boardState.flat().reduce((acc, s) => acc + (s === -2), 0);
	drawCounter(32, 30, mineCount - flagCount, 3);

	ctx.drawImage(win ? sprites.button.win : mines ? sprites.button.fail : sprites.button.normal, ...buttonPosSize());

	drawCounter(canvas.width - 28 - counterWidth(3), 30, timer, 3);

	// Board
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
				drawTile(x, y, (!mines || isMine) ? sprites.flag : sprites.mineWrong);
			else if (n > 0)
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
		send({ type: "reset" })
	} else if (button === 0 || button === 2) {
		x = Math.floor((x - sprites.frame.left.width * GUI_SCALE) / TILE_SIZE);
		y = Math.floor((y - sprites.frame.top.height * GUI_SCALE) / TILE_SIZE);

		if (x >= 0 && x < boardState[0].length && y >= 0 && y < boardState.length)
			send({ type: button === 0 ? "click" : "flag", pos: [x, y] });

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

function setBoardState(state) {
	boardState = state;
	updateBoardSize();
	draw();
}

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

		case "timer":
			timer = data.timer;
			draw();
			break;

		case "reset":
			win = false;
			mines = undefined;
		case "board":
			if (data.mineCount)
				mineCount = data.mineCount;
			setBoardState(data.boardState);
			break;

		case "fail":
			mines = data.mines;
			if (data.mineCount)
				mineCount = data.mineCount;
			setBoardState(data.boardState);
			break;

		case "win":
			win = true;
			setBoardState(data.boardState);
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