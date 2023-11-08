import React, { createContext, useCallback, useEffect, useState } from "react";
import { WithChildren } from "../util/WithChildren";

export interface WebSocketValue {
  websocket?: WebSocket;
  setMessageListener: (listener: (evt: MessageEvent) => void) => void;
  refresh: () => void;
}

export const WebSocketContext = createContext<WebSocketValue>({
  setMessageListener: () => {},
  refresh: () => {},
});

export function WebSocketProvider({ children }: WithChildren) {
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messageListener, setMessageListener] =
    useState<(evt: MessageEvent) => void>();

  const init = useCallback(
    () => setWebsocket(new WebSocket("wss://" + location.host)),
    [setWebsocket],
  );

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (websocket == null) return;

    websocket.addEventListener("message", messageListener);

    return () => websocket.removeEventListener("message", messageListener);
  }, [websocket, messageListener]);

  useEffect(() => {
    if (websocket == null) return;

    const onError = () => setWebsocket(new WebSocket("ws://" + location.host));
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
