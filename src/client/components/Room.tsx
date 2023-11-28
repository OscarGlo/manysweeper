import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { PasswordContext } from "../contexts/Password";

export function Room() {
  const { id } = useParams();
  const { password } = useContext(PasswordContext);
  return (
    <WebSocketProvider query={{ id, password }}>
      <GameBoard />
    </WebSocketProvider>
  );
}
