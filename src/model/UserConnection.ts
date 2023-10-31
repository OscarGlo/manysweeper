import { Vector } from "../util/Vector";
import { Color } from "../util/Color";

export interface UserConnection {
  id: number;
  username: string;
  color: Color;

  cursorPos?: Vector;
  nextCursorPos?: Vector;
}
