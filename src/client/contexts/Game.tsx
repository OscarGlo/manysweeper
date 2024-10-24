import React, { createContext, useMemo } from "react";
import { GameState, GuessLevel } from "../../model/GameState";
import { WithChildren } from "../util/WithChildren";
import { MatrixType } from "../../util/Matrix";

export interface GameContextValue {
  game?: GameState;
}

export const GameContext = createContext<GameContextValue>({});

export function GameProvider({ children }: WithChildren) {
  const game = useMemo(() => {
    const state = new GameState(1, 1, 0, MatrixType.SQUARE, GuessLevel.None);
    state.init = false;
    return state;
  }, []);

  return (
    <GameContext.Provider value={{ game }}>{children}</GameContext.Provider>
  );
}
