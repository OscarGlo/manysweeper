import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React from "react";
import { useParams } from "react-router";

export function Room() {
  const { id } = useParams();
  return (
    <WebSocketProvider query={id}>
      <GameBoard />
    </WebSocketProvider>
  );
}
