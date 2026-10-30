import { WebSocketQuery } from "../../model/wsQueries";
import { useCallback, useEffect, useState } from "react";
import qs from "qs";

export interface UseWebSocketReturn {
  websocket: WebSocket;
}

export function useWebSocket(
  query: WebSocketQuery,
  onMessage?: (msg: MessageEvent) => void,
): UseWebSocketReturn {
  const [websocket, setWebsocket] = useState<WebSocket>();

  const url = location.host + "?" + qs.stringify(query);

  const init = useCallback(() => {
    setWebsocket((_) => new WebSocket("wss://" + url));
  }, [setWebsocket]);

  useEffect(init, [init]);

  useEffect(() => {
    if (websocket == null) return;
    const onError = () => setWebsocket(new WebSocket("ws://" + url));
    websocket.addEventListener("error", onError);

    return () => websocket.removeEventListener("error", onError);
  }, [websocket, setWebsocket]);

  useEffect(() => {
    if (websocket == null || onMessage == null) return;

    websocket.addEventListener("message", onMessage);

    return () => websocket.removeEventListener("message", onMessage);
  }, [websocket, onMessage]);

  return { websocket };
}
