import { MatrixType } from "../util/Matrix";
import { GuessLevel } from "./GameState";

export interface CreateRoom {
  name: string;
  password?: string;

  width: number;
  height: number;
  mines: number;
  type: MatrixType;
  guessLevel: GuessLevel;
}
