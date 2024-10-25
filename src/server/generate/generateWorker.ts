import { workerData, parentPort } from "worker_threads";

import { GameState } from "../../model/GameState";

const game = GameState.copy(workerData as GameState);
game.generate();
parentPort.postMessage(game);
