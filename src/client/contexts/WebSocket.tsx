import React, { createContext, useCallback, useEffect, useState } from "react";
import { WithChildren } from "../util/WithChildren";
import { useNavigate } from "react-router-dom";

export interface WebSocketValue {
  websocket?: WebSocket;
  setMessageListener: (listener: (evt: MessageEvent) => void) => void;
  refresh: () => void;
}

export const WebSocketContext = createContext<WebSocketValue>({
  setMessageListener: () => {},
  refresh: () => {},
});

export interface WebSocketProviderProps extends WithChildren {
  query?: string;
}

export function WebSocketProvider({ children, query }: WebSocketProviderProps) {
  const navigate = useNavigate();
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messageListener, setMessageListener] =
    useState<(evt: MessageEvent) => void>();

  const url = location.host + (query ? `?${query}` : "");

  const init = useCallback(
    () => setWebsocket(new WebSocket("wss://" + url)),
    [setWebsocket],
  );

  useEffect(() => init(), [init]);

  const onMessage = useCallback(
    async (evt: MessageEvent) => {
      const data = new Uint8Array(await evt.data.arrayBuffer());
      if (data.length === 0) return navigate(`/?errorId=${query}`);

      messageListener(evt);
    },
    [messageListener],
  );

  useEffect(() => {
    if (websocket == null) return;

    websocket.addEventListener("message", onMessage);

    return () => websocket.removeEventListener("message", onMessage);
  }, [websocket, onMessage]);

  useEffect(() => {
    if (websocket == null) return;

    const onError = () => setWebsocket(new WebSocket("ws://" + url));
    websocket.addEventListener("error", onError);

    return () => websocket.removeEventListener("error", onError);
  }, [websocket, setWebsocket]);

  return (
    <WebSocketContext.Provider
      value={{
        websocket,
        setMessageListener: (value) => setMessageListener(() => value),
        refresh: init,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
