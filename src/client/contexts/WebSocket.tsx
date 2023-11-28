import React, { createContext, useCallback, useEffect, useState } from "react";
import { WithChildren } from "../util/WithChildren";
import { useNavigate } from "react-router-dom";
import qs from "qs";
import { WebSocketQuery } from "../../model/WebSocketQuery";
import {
  deserializeMessage,
  ErrorType,
  formatMessageData,
  Message,
  MessageType,
} from "../../model/messages";

export interface WebSocketValue {
  websocket?: WebSocket;
  setMessageListener: (listener: (msg: Message) => void) => void;
  refresh: () => void;
}

export const WebSocketContext = createContext<WebSocketValue>({
  setMessageListener: () => {},
  refresh: () => {},
});

export interface WebSocketProviderProps extends WithChildren {
  query: WebSocketQuery;
}

export function WebSocketProvider({ children, query }: WebSocketProviderProps) {
  const navigate = useNavigate();
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messageListener, setMessageListener] =
    useState<(msg: Message) => void>();

  const url = location.host + "?" + qs.stringify(query);

  const init = useCallback(
    () => setWebsocket(new WebSocket("wss://" + url)),
    [setWebsocket],
  );

  useEffect(() => init(), [init]);

  const onMessage = useCallback(
    async (evt: MessageEvent) => {
      const data = new Uint8Array(await evt.data.arrayBuffer());
      const msg = formatMessageData(deserializeMessage(data));

      if (msg.type === MessageType.ERROR) {
        const params = { errorId: query.id };
        if (msg.error === ErrorType.WRONG_PASS) params["wrongPass"] = true;
        return navigate(`/?${qs.stringify(params)}`);
      }

      messageListener(msg);
    },
    [query, navigate, messageListener],
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
