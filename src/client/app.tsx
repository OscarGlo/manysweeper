import React from "react";
import { createRoot } from "react-dom/client";
import { Navigation } from "./components/Navigation";
import { CookiesProvider } from "./contexts/Cookies";
import { AppThemeProvider } from "./contexts/AppTheme";
import { Stack } from "@mui/material";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SkinProvider } from "./contexts/Skin";
import { RoomList } from "./components/RoomList";
import { Room } from "./components/Room";
import { PasswordProvider } from "./contexts/Password";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RoomList />,
  },
  {
    path: "/room/:id",
    element: <Room />,
  },
]);

function App(): React.ReactElement {
  return (
    <CookiesProvider>
      <AppThemeProvider>
        <SkinProvider>
          <PasswordProvider>
            <Stack direction="column" height="100vh">
              <Navigation />
              <RouterProvider router={router} />
            </Stack>
          </PasswordProvider>
        </SkinProvider>
      </AppThemeProvider>
    </CookiesProvider>
  );
}

const root = createRoot(document.getElementById("app"));
root.render(<App />);
