import { CreateRoom } from "./CreateRoom";
import { GameState } from "./GameState";

export class Room {
  static TIMEOUT = 1000 * 60 * 10;
  static MAX_NAME_LENGTH = 64;

  name: string;
  game: GameState;

  timeout: NodeJS.Timeout;

  constructor(options: CreateRoom) {
    this.name = (options.name ?? "New room").substring(0, Room.MAX_NAME_LENGTH);
    this.game = new GameState(options.width, options.height, options.mines);
  }
}
