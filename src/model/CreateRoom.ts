export interface CreateRoom {
  name: string;
  password?: string;

  width: number;
  height: number;
  mines: number;
}
