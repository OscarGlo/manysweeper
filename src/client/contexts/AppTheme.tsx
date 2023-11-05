import React, { createContext, useCallback, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import { WithChildren } from "../util/WithChildren";

export interface AppThemeValue {
  setBackgroundColor: (color: string) => void;
}

export const AppThemeContext = createContext<AppThemeValue>({
  setBackgroundColor: () => {},
});

export function AppThemeProvider({ children }: WithChildren) {
  const [theme, setTheme] = useState(createTheme());

  const setBackgroundColor = useCallback(
    (color: string) => {
      theme.palette.background.default = color;
      setTheme(theme);
    },
    [theme, setTheme],
  );

  return (
    <AppThemeContext.Provider value={{ setBackgroundColor }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppThemeContext.Provider>
  );
}
