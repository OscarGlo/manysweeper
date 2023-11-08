import React, { createContext, useMemo } from "react";
import { Skin } from "../board/Skin";
import { WithChildren } from "../util/WithChildren";

export interface SkinValue {
  skin?: Skin;
}

export const SkinContext = createContext<SkinValue>({});

export function SkinProvider({ children }: WithChildren) {
  const skin = useMemo(() => new Skin("classic"), []);

  return (
    <SkinContext.Provider value={{ skin }}>{children}</SkinContext.Provider>
  );
}
