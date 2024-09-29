import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
import { CookiesContext } from "./Cookies";

export interface WebSocketValue {
  websocket?: WebSocket;
  setMessageListener: (listener: (msg: Message) => void) => void;
}

export const WebSocketContext = createContext<WebSocketValue>({
  setMessageListener: () => {},
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

  const init = useCallback(() => {
    setWebsocket((ws) => {
      ws?.close();
      return new WebSocket("wss://" + url);
    });
  }, [setWebsocket]);

  const { cookies } = useContext(CookiesContext);

  useEffect(init, [init, cookies]);

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
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
