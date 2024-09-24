import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { PasswordContext } from "../contexts/Password";
import { Box, Stack } from "@mui/material";
import { GameProvider } from "../contexts/Game";
import { UserList } from "./UserList";

export function Room() {
  const { id } = useParams();
  const { password } = useContext(PasswordContext);
  return (
    <WebSocketProvider query={{ id, password }}>
      <GameProvider>
        <Stack direction="row" sx={{ width: "100%", height: "100%" }}>
          <UserList />
          <Box flex={1} overflow="auto" textAlign="center" paddingTop={6}>
            <GameBoard />
          </Box>
        </Stack>
      </GameProvider>
    </WebSocketProvider>
  );
}
