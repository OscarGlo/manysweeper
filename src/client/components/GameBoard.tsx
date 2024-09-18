import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  draw,
  getTilePos,
  getBoardSize,
  updateCursorPos,
  getCanvasSize,
  drawCursors,
} from "../board/render";
import {
  Action,
  messageListener,
  onActionDown,
  onActionUp,
  onMouseMove,
} from "../board/board";
import { SkinContext } from "../contexts/Skin";
import { Box, styled } from "@mui/material";
import { WebSocketContext } from "../contexts/WebSocket";
import { Vector } from "../../util/Vector";
import { MessageType } from "../../model/messages";
import { GameContext } from "../contexts/Game";

const Canvas = styled("canvas")({});

const mouseActions = [Action.BREAK, Action.CHORD, Action.FLAG];
const keyActions = {
  KeyZ: Action.BREAK,
  KeyX: Action.FLAG,
  KeyC: Action.CHORD,
};

export function GameBoard(): React.ReactElement {
  const [layers, setLayers] = useState<HTMLCanvasElement[]>([]);
  const [contexts, setContexts] = useState<CanvasRenderingContext2D[]>([]);
  const mousePos = useRef(new Vector());
  function setMousePos(pos: Vector) {
    mousePos.current = pos;
  }

  const { websocket, setMessageListener } = useContext(WebSocketContext);

  const getLayer = useCallback(
    (index: number) => (elt?: HTMLCanvasElement) => {
      if (elt) {
        elt.focus();

        layers[index] = elt;
        setLayers(layers);

        contexts[index] = elt.getContext("2d");
        setContexts(contexts);
      }
    },
    [layers, setLayers, contexts, setContexts],
  );

  const container = useRef<HTMLDivElement>();

  const { game } = useContext(GameContext);
  const { skin } = useContext(SkinContext);

  function updateCanvasSize(size: Vector) {
    layers.forEach((layer) => {
      layer.width = size.x;
      layer.height = size.y;
    });
    container.current.style.width = `${size.x}px`;
    container.current.style.height = `${size.y}px`;
  }

  const boardSize = useRef<Vector>();

  useEffect(() => {
    const onLoad = () => {
      const size = getBoardSize(game);
      boardSize.current = size;
      updateCanvasSize(getCanvasSize(skin, size));
    };
    skin.on("load", onLoad);

    return () => void skin.removeListener("load", onLoad);
  }, [skin, game]);

  useEffect(() => {
    setMessageListener(async (msg) => {
      await messageListener(layers[0], skin, game, msg);

      if (msg.type === MessageType.BOARD) {
        const size = getBoardSize(game);
        boardSize.current = size;
        updateCanvasSize(getCanvasSize(skin, size));
      }

      if (msg.type !== MessageType.CURSOR && contexts[0])
        draw(layers[0], contexts[0], skin, game, boardSize.current);
    });
  }, [messageListener, layers[0], skin, game]);

  const holding = useRef<boolean>();
  const clicked = useRef<Vector | undefined>();
  const time = useRef<number>(0);

  const update = useCallback(() => {
    updateCursorPos(game);
    if (contexts[1]) drawCursors(layers[1], contexts[1], game);
    if (
      contexts[0] &&
      ((clicked.current == null && game.clickedTile != null) ||
        (clicked.current != null &&
          !clicked.current.equals(game.clickedTile)) ||
        holding.current !== game.holding ||
        time.current !== game.timer.time)
    ) {
      clicked.current = game.clickedTile;
      holding.current = game.holding;
      time.current = game.timer.time;
      draw(layers[0], contexts[0], skin, game, boardSize.current);
    }

    const frameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frameId);
  }, [layers, contexts, boardSize]);

  requestAnimationFrame(update);

  const canvasStyle = {
    position: "absolute",
    top: 0,
    left: 0,
  };

  return (
    <Box position="relative" display="inline-block" ref={container}>
      <Canvas
        ref={getLayer(0)}
        sx={{ ...canvasStyle, imageRendering: "pixelated" }}
      />
      <Canvas
        ref={getLayer(1)}
        onContextMenu={(evt) => evt.preventDefault()}
        onMouseMove={(evt) => {
          if (layers[1])
            onMouseMove(websocket, layers[1], game, skin, evt, setMousePos);
        }}
        onMouseDown={(evt) => {
          const action = mouseActions[evt.button];
          const tile = getTilePos(skin, mousePos.current);
          if (action != null) onActionDown(game, tile, action);
        }}
        onMouseUp={(evt) => {
          const action = mouseActions[evt.button];
          if (action != null)
            onActionUp(
              websocket,
              mousePos.current,
              game,
              skin,
              action,
              boardSize.current,
            );
        }}
        tabIndex={0}
        onKeyDown={(evt) => {
          const action = keyActions[evt.code];
          const tile = getTilePos(skin, mousePos.current);
          if (action != null) onActionDown(game, tile, action);
        }}
        onKeyUp={(evt) => {
          const action = keyActions[evt.code];
          if (action != null)
            onActionUp(
              websocket,
              mousePos.current,
              game,
              skin,
              action,
              boardSize.current,
            );
        }}
        sx={{
          ...canvasStyle,
          cursor: "url(/img/cursor.png), default",
          outline: "none",
        }}
      />
    </Box>
  );
}
