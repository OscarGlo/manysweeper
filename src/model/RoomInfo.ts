import { CreateRoom } from "./CreateRoom";

export interface RoomInfo extends Omit<CreateRoom, "password"> {
  id: number;
  private: boolean;
  players: string;
}
