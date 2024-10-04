import { MatrixType } from "../util/Matrix";

export interface CreateRoom {
  name: string;
  password?: string;

  width: number;
  height: number;
  mines: number;
  type: MatrixType;
}
