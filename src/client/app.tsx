import React from "react";
import { createRoot } from "react-dom/client";
import { Navigation } from "./components/Navigation";
import { CookiesProvider } from "./contexts/Cookies";
import { AppThemeProvider } from "./contexts/AppTheme";
import { GameBoard } from "./components/GameBoard";
import { SkinProvider } from "./contexts/Skin";
import { Stack, Container } from "@mui/material";
import { WebSocketProvider } from "./contexts/WebSocket";

function App(): React.ReactElement {
  return (
    <CookiesProvider>
      <AppThemeProvider>
        <SkinProvider>
          <WebSocketProvider>
            <Stack direction="column" height="100vh">
              <Navigation />
              <Container
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GameBoard />
              </Container>
            </Stack>
          </WebSocketProvider>
        </SkinProvider>
      </AppThemeProvider>
    </CookiesProvider>
  );
}

const root = createRoot(document.getElementById("app"));
root.render(<App />);
