import React, { createContext, useState } from "react";
import { WithChildren } from "../util/WithChildren";

export interface PasswordValue {
  password?: string;
  setPassword: (password?: string) => void;
}

export const PasswordContext = createContext<PasswordValue>({
  setPassword: () => {},
});

export function PasswordProvider({ children }: WithChildren) {
  const [password, setPassword] = useState<string>();

  return (
    <PasswordContext.Provider value={{ password, setPassword }}>
      {children}
    </PasswordContext.Provider>
  );
}
