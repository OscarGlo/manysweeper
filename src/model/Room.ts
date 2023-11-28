import { CreateRoom } from "./CreateRoom";
import { GameState } from "./GameState";
import bcrypt from "bcryptjs";

export class Room {
  static TIMEOUT = 1000 * 60 * 10;
  static MAX_NAME_LENGTH = 64;

  name: string;
  private: boolean;
  passwordHash?: string;
  game: GameState;

  timeout: NodeJS.Timeout;

  constructor(options: CreateRoom) {
    this.name = (options.name ?? "New room").substring(0, Room.MAX_NAME_LENGTH);
    this.private = options.password != null;
    if (this.private)
      bcrypt
        .hash(options.password, 10)
        .then((hash) => (this.passwordHash = hash));

    this.game = new GameState(options.width, options.height, options.mines);
    this.game.generate();
  }
}
