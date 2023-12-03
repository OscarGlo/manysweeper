import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  draw,
  getTilePos,
  updateBoardSize,
  updateCursorPos,
} from "../board/render";
import { GameState } from "../../model/GameState";
import {
  Action,
  messageListener,
  onActionDown,
  onActionUp,
  onMouseMove,
} from "../board/board";
import { SkinContext } from "../contexts/Skin";
import { styled } from "@mui/material";
import { WebSocketContext } from "../contexts/WebSocket";
import { Vector } from "../../util/Vector";

const Canvas = styled("canvas")({});

const mouseActions = [Action.BREAK, Action.CHORD, Action.FLAG];
const keyActions = {
  KeyZ: Action.BREAK,
  KeyX: Action.FLAG,
  KeyC: Action.CHORD,
};

export function GameBoard(): React.ReactElement {
  const [canvas, setCanvas] = useState<HTMLCanvasElement>();
  const [context, setContext] = useState<CanvasRenderingContext2D>();
  const mousePos = useRef(new Vector());
  function setMousePos(pos: Vector) {
    mousePos.current = pos;
  }

  const { websocket, setMessageListener } = useContext(WebSocketContext);

  const getCanvas = useCallback(
    (elt?: HTMLCanvasElement) => {
      if (elt) {
        elt.focus();
        setCanvas(elt);
        setContext(elt?.getContext("2d"));
      }
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
      onMouseMove={(evt) => {
        if (canvas)
          onMouseMove(websocket, canvas, game, skin, evt, setMousePos);
      }}
      onMouseDown={(evt) => {
        const action = mouseActions[evt.button];
        const tile = getTilePos(skin, mousePos.current);
        if (action != null && canvas) onActionDown(game, tile, action);
      }}
      onMouseUp={(evt) => {
        const action = mouseActions[evt.button];
        if (action != null && canvas)
          onActionUp(websocket, mousePos.current, game, skin, action);
      }}
      tabIndex={0}
      onKeyDown={(evt) => {
        const action = keyActions[evt.code];
        const tile = getTilePos(skin, mousePos.current);
        if (action != null && canvas) onActionDown(game, tile, action);
      }}
      onKeyUp={(evt) => {
        const action = keyActions[evt.code];
        if (action != null && canvas)
          onActionUp(websocket, mousePos.current, game, skin, action);
      }}
      sx={{
        display: "inline-block",
        cursor: "url(img/cursor.png), default",
        outline: "none",
      }}
    />
  );
}
