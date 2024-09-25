import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { PasswordContext } from "../contexts/Password";
import { Box, IconButton, Stack } from "@mui/material";
import { GameProvider } from "../contexts/Game";
import { UserList } from "./UserList";
import { useToggle } from "../hooks/useToggle";
import People from "@mui/icons-material/People";

export function Room() {
  const { id } = useParams();
  const { password } = useContext(PasswordContext);

  const [userListOpen, toggleUserListOpen] = useToggle(true);

  return (
    <WebSocketProvider query={{ id, password }}>
      <GameProvider>
        <Stack direction="row" sx={{ width: "100%", height: "100%" }}>
          {userListOpen ? <UserList /> : null}

          <Box padding={1}>
            <IconButton onClick={toggleUserListOpen} sx={{ minHeight: 0 }}>
              <People
                color={
                  (userListOpen ? "primary" : "disabled") as
                    | "primary"
                    | "disabled"
                }
              />
            </IconButton>
          </Box>

          <Box flex={1} overflow="auto" textAlign="center" paddingTop={6}>
            <GameBoard />
          </Box>
        </Stack>
      </GameProvider>
    </WebSocketProvider>
  );
}
