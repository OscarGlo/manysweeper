import React, { createContext, useCallback, useMemo, useState } from "react";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { WithChildren } from "../util/WithChildren";

export interface AppThemeValue {
  setMode: (dark: boolean) => void;
}

export const AppThemeContext = createContext<AppThemeValue>({
  setMode: () => {},
});

export function AppThemeProvider({ children }: WithChildren) {
  const lightTheme = useMemo(() => createTheme(), [createTheme]);
  const darkTheme = useMemo(
    () => createTheme({ palette: { mode: "dark" } }),
    [createTheme],
  );
  const [theme, setTheme] = useState(lightTheme);

  const setMode = useCallback(
    (dark: boolean) => setTheme(dark ? darkTheme : lightTheme),
    [theme, setTheme],
  );

  return (
    <AppThemeContext.Provider value={{ setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}
