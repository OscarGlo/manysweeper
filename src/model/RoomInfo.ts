import { CreateRoom } from "./CreateRoom";

export interface RoomInfo extends Omit<CreateRoom, "password"> {
  id: number;
  open?: boolean;
  private: boolean;
  players: string;
}
