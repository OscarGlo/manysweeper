export class GameState {
  board: number[][];
  flags: number[][];

  mines: boolean[][];
  counts: number[][];

  firstClick: boolean;
  fail: boolean;
  win: boolean;
  loserId: number;
  time: number;
}
