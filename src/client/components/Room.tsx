import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { PasswordContext } from "../contexts/Password";
import { Box } from "@mui/material";

export function Room() {
  const { id } = useParams();
  const { password } = useContext(PasswordContext);
  return (
    <WebSocketProvider query={{ id, password }}>
      <Box flex={1} overflow="auto" textAlign="center" paddingTop={6}>
        <GameBoard />
      </Box>
    </WebSocketProvider>
  );
}
