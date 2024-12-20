import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  draw,
  getBoardSize,
  updateCursorPos,
  getCanvasSize,
  drawCursors,
  getTilePos,
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

const HOLD_FLAG_TIME = 200;

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
  const cursorPos = useRef(new Vector());
  function setCursorPos(pos: Vector) {
    cursorPos.current = pos;
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

  const actionUpHandler = (action: Action) =>
    onActionUp(websocket, cursorPos.current, game, skin, action, layers[1]);

  const mouseMoveHandler = (clientPos: Vector) =>
    onMouseMove(websocket, layers[1], game, skin, clientPos, setCursorPos);

  const _draw = () =>
    draw(layers[0], contexts[0], skin, game, boardSize.current);

  useEffect(() => {
    const onLoad = () => {
      const size = getBoardSize(game);
      boardSize.current = size;
      updateCanvasSize(getCanvasSize(skin, size));
      _draw();
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

      if (msg.type !== MessageType.CURSOR && contexts[0]) _draw();
    });
  }, [messageListener, layers[0], skin, game]);

  const holding = useRef<boolean>();
  const clicked = useRef<Vector | undefined>();
  const time = useRef<number>(0);

  const update = useCallback(() => {
    updateCursorPos(game);
    if (contexts[1]) drawCursors(layers[1], contexts[1], game, skin);
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
      _draw();
    }

    const frameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frameId);
  }, [layers, contexts, boardSize]);

  requestAnimationFrame(update);

  const holdTimeout = useRef<NodeJS.Timeout>();
  const ignoreUp = useRef<boolean>(false);

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
        onContextMenu={(evt) => {
          ignoreUp.current = false;
          evt.preventDefault();
        }}
        onMouseMove={(evt) => {
          if (layers[1]) mouseMoveHandler(new Vector(evt.clientX, evt.clientY));
        }}
        onMouseDown={(evt) => {
          if (holdTimeout.current != null) return;

          const action = mouseActions[evt.button];
          if (action != null)
            onActionDown(game, getTilePos(game, cursorPos.current), action);
        }}
        onMouseUp={(evt) => {
          if (ignoreUp.current) {
            ignoreUp.current = false;
            return;
          }

          ignoreUp.current = false;
          clearTimeout(holdTimeout.current);

          const action = mouseActions[evt.button];
          if (action != null) actionUpHandler(action);
        }}
        onKeyDown={(evt) => {
          const action = keyActions[evt.code];
          if (action != null)
            onActionDown(game, getTilePos(game, cursorPos.current), action);
        }}
        onKeyUp={(evt) => {
          const action = keyActions[evt.code];
          if (action != null) actionUpHandler(action);
        }}
        onTouchStart={(evt) => {
          mouseMoveHandler(
            new Vector(evt.touches[0].clientX, evt.touches[0].clientY),
          );
          onActionDown(game, getTilePos(game, cursorPos.current), Action.BREAK);

          holdTimeout.current = setTimeout(() => {
            actionUpHandler(Action.FLAG);
            ignoreUp.current = true;
          }, HOLD_FLAG_TIME);
        }}
        tabIndex={0}
        sx={{
          ...canvasStyle,
          cursor: "url(/img/cursor.png), default",
          outline: "none",
        }}
      />
    </Box>
  );
}
