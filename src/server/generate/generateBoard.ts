import * as path from "path";
import { Worker } from "worker_threads";

import { GameState } from "../../model/GameState";
import { Vector } from "../../util/Vector";
import { Matrix } from "../../util/Matrix";

export function generateBoard(game: GameState): Promise<void> {
  return new Promise((res) => {
    game.loading = true;

    const worker = new Worker(
      `${path.join(__dirname, "./generateWorker.js")}`,
      {
        workerData: game,
      },
    );

    worker.on("message", (value: GameState) => {
      game.mines = Matrix.copy(value.mines);
      game.counts = Matrix.copy(value.counts);
      if (value.startPos != null)
        game.startPos = new Vector(value.startPos.x, value.startPos.y);
      game.loading = false;
      res();
    });
  });
}
