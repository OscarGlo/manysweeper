import { Message, MessageData, MessageType } from "./messages";
import { Border } from "./minesweeper";
import { Matrix } from "./util/Matrix";
import { Vector } from "./util/Vector";

const DIR_ENCODE = {
  0: {
    1: 0b00000,
    [-1]: 0b01000,
  },
  1: { 0: 0b10000 },
  [-1]: { 0: 0b11000 },
};

const DIR_DECODE = {
  0b00000: [0, 1],
  0b01000: [0, -1],
  0b10000: [1, 0],
  0b11000: [-1, 0],
};

export function getHoleMessage(
  border: Border,
  counts: Matrix<number>,
  clickPos: Vector,
  last: boolean,
): MessageData {
  const start = border.pop();

  const directions: number[] = [];
  let prev: Vector, current: Vector;

  while (border.length > 0) {
    prev = current ?? start;
    current = border.pop();

    directions.push(
      DIR_ENCODE[current.x - prev.x][current.y - prev.y] + counts.get(prev),
    );
  }
  directions.push(counts.get(current));

  return [
    MessageType.HOLE,
    clickPos.x,
    clickPos.y,
    start.x,
    start.y,
    last,
    directions,
  ];
}

export function openBorder(
  boardState: Matrix<number>,
  holeMessage: Message,
): Matrix<number> {
  boardState = boardState.copy();
  const pos = new Vector(
    holeMessage.startX as number,
    holeMessage.startY as number,
  );

  for (const direction of holeMessage.directions as number[]) {
    if (direction === 0) break;

    boardState.set(pos, direction & 0b111);
    pos.add(DIR_DECODE[direction & 0b11000]);
  }

  return boardState;
}

export function openHole(boardState: Matrix<number>, holeMessage: Message) {
  boardState = boardState.copy();

  const queue = [
    new Vector(holeMessage.clickX as number, holeMessage.clickY as number),
  ];
  const visited = [];

  while (queue.length > 0) {
    const pos = queue.pop();
    visited.push(pos);

    if (boardState.get(pos) === 9) boardState.set(pos, 0);

    const filtered = [...visited, ...queue];
    boardState.forEachNeighbor(pos, (state, p) => {
      if (!filtered.some((q) => p.equals(q)) && (state === 9 || state === 0))
        queue.unshift(p);
    });
  }

  return boardState;
}
