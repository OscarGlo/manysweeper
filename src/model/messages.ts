import { deserialize, serialize } from "../util/serialization";

export enum MessageType {
  ERROR,
  INIT,
  USER,
  DISCONNECT,
  CURSOR,
  TILE,
  CHORD,
  HOLE,
  BOARD,
  FLAG,
  WIN,
  LOSE,
  RESET,
  CHAT,
  COLOR,
  LOADING,
}

export type MessageSpecValue = number | [number] | "";
export type MessageSpec = Record<string, MessageSpecValue>;

export enum ErrorType {
  NOT_FOUND,
  WRONG_PASS,
}

export const MessageSpecs: { [type in MessageType]: MessageSpec } = {
  [MessageType.ERROR]: {
    error: Math.ceil(Math.log2(Object.values(ErrorType).length)),
  },
  [MessageType.INIT]: {
    id: 8,
    mineCount: 10,
    time: 8,
    width: 7,
    height: 7,
    tileType: 2,
    guessLevel: 2,
    gamemode: 1,
    hasStart: 1,
    startX: 7,
    startY: 7,
    started: 1,
    flags: [13],
  },
  [MessageType.USER]: {
    id: 8,
    score: 8,
    hue: 10,
    saturation: 7,
    lightness: 7,
    update: 1,
    username: "",
  },
  [MessageType.DISCONNECT]: { id: 8 },
  [MessageType.CURSOR]: { x: 12, y: 12, id: 8 },
  [MessageType.TILE]: { x: 8, y: 8, tile: 4 },
  [MessageType.CHORD]: { x: 8, y: 8, tiles: [4] },
  [MessageType.HOLE]: {
    clickX: 8,
    clickY: 8,
    startX: 8,
    startY: 8,
    last: 1,
    directions: [6],
  },
  [MessageType.BOARD]: { tiles: [4] },
  [MessageType.FLAG]: { x: 8, y: 8, id: 8, colorId: 5 },
  [MessageType.WIN]: {},
  [MessageType.LOSE]: { id: 8, mines: [1] },
  [MessageType.RESET]: { mineCount: 10, hasStart: 1, startX: 7, startY: 7 },
  [MessageType.CHAT]: { id: 8, message: "" },
  [MessageType.COLOR]: { id: 8, hue: 10, saturation: 7, lightness: 7 },
  [MessageType.LOADING]: {},
};

const typeBits = Math.ceil(Math.log2(Object.values(MessageSpecs).length));

export type MessageValue = number | number[] | boolean | boolean[] | string;

export function serializeMessage(data: MessageValue[]): Uint8Array {
  const type = data[0] as string;
  const specs: MessageSpecValue[] = Object.values(MessageSpecs[type]);
  const sizes = [typeBits];
  const specLen = specs.length;
  for (let i = 0; i < specLen; i++) {
    const spec = specs[i];
    const isString = typeof spec === "string";

    if (isString && typeof data[i + 1] === "string")
      data[i + 1] = [...(data[i + 1] as string)].map((c) => c.charCodeAt(0));

    if (isString || Array.isArray(spec)) {
      const elemLen = isString ? 8 : spec[0];
      const dataLen = data[i + 1] ? (data[i + 1] as number[]).length : 0;
      for (let j = 0; j < dataLen; j++) sizes.push(elemLen);
    } else {
      sizes.push(spec as number);
    }
  }

  return serialize(data.flat() as number[], sizes);
}

export type MessageData = (number | number[] | boolean)[];

export function deserializeMessage(data: Uint8Array): MessageData {
  const offset = 8 - typeBits;
  const type = (data[0] & ((typeBits ** 2 - 1) << offset)) >> offset;
  const specs = MessageSpecs[type];
  const sizes: MessageSpecValue[] = Object.values(MessageSpecs[type]);
  sizes.unshift(typeBits);

  const dataBits = data.length * 8;
  const fixedBits = sizes.reduce<number>(
    (a, b) => a + ((Array.isArray(b) ? 0 : b) as number),
    0,
  );
  const hasString = sizes.some((s) => typeof s === "string");
  const arrayElemBits = hasString ? 8 : (sizes.find(Array.isArray) ?? [0])[0];
  if (arrayElemBits > 0) {
    sizes.pop();
    const length = Math.floor((dataBits - fixedBits) / arrayElemBits);
    for (let i = 0; i < length; i++) sizes.push(arrayElemBits);
  }

  const arr = deserialize(data, sizes as number[]);

  const msgData = [];
  const specEntries = Object.entries(specs);
  specEntries.unshift(["type", typeBits]);
  const len = specEntries.length;
  for (let i = 0; i < len; i++) {
    const spec = specEntries[i][1];
    msgData.push(
      typeof spec === "string"
        ? String.fromCharCode(...arr)
        : Array.isArray(spec)
          ? arr
          : arr.shift(),
    );
  }

  return msgData;
}

export type Message = Record<string, MessageValue>;

export function formatMessageData(messageData: MessageData): Message {
  const type = messageData.shift() as number;
  const specs = Object.entries(MessageSpecs[type]);
  const entries = messageData.map((d, i) => [specs[i][0], d]);
  entries.unshift(["type", type]);
  return Object.fromEntries(entries);
}
