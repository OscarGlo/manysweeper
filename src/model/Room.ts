import { CreateRoom } from "./CreateRoom";
import { GameState } from "./GameState";

export class Room {
  static TIMEOUT = 1000 * 60 * 10;

  name: string;
  game: GameState;

  timeout: NodeJS.Timeout;

  constructor(options: CreateRoom) {
    this.name = options.name;
    this.game = new GameState(options.width, options.height, options.mines);
  }
}
