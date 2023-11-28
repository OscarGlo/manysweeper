import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { draw, updateBoardSize, updateCursorPos } from "../board/render";
import { GameState } from "../../model/GameState";
import {
  messageListener,
  onMouseDown,
  onMouseMove,
  onMouseUp,
} from "../board/board";
import { SkinContext } from "../contexts/Skin";
import { styled } from "@mui/material";
import { WebSocketContext } from "../contexts/WebSocket";

const Canvas = styled("canvas")({});

export function GameBoard(): React.ReactElement {
  const [canvas, setCanvas] = useState<HTMLCanvasElement>();
  const [context, setContext] = useState<CanvasRenderingContext2D>();

  const { websocket, setMessageListener } = useContext(WebSocketContext);

  const getCanvas = useCallback(
    (elt: HTMLCanvasElement) => {
      setCanvas(elt);
      setContext(elt?.getContext("2d"));
    },
    [setCanvas, setContext],
  );

  const game = useMemo(() => {
    const state = new GameState(1, 1, 0);
    state.init = false;
    return state;
  }, []);
  const { skin } = useContext(SkinContext);

  useEffect(() => {
    const onLoad = () => {
      if (canvas) updateBoardSize(canvas, skin, game);
    };
    skin.on("load", onLoad);

    return () => void skin.removeListener("load", onLoad);
  }, [canvas, skin, game]);

  useEffect(() => {
    setMessageListener((msg) => messageListener(canvas, skin, game, msg));
  }, [messageListener, canvas, skin, game]);

  const update = useCallback(() => {
    updateCursorPos(game);
    if (context) draw(canvas, context, skin, game);

    const frameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frameId);
  }, [canvas, context]);

  update();

  return (
    <Canvas
      ref={getCanvas}
      onContextMenu={(evt) => evt.preventDefault()}
      onMouseDown={(evt) => {
        if (canvas) onMouseDown(canvas, game, skin, evt);
      }}
      onMouseMove={(evt) => {
        if (canvas) onMouseMove(websocket, canvas, game, skin, evt);
      }}
      onMouseUp={(evt) => {
        if (canvas) onMouseUp(websocket, canvas, game, skin, evt);
      }}
      sx={{
        cursor: "url(img/cursor.png), default",
        margin: "auto",
      }}
    />
  );
}
