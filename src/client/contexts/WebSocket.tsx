import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  serializeMessage,
} from "../../model/messages";
import { CookiesContext } from "./Cookies";
import { Color } from "../../util/Color";
import { Semaphore } from "../util/Semaphore";

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
    setWebsocket((ws) => new WebSocket("wss://" + url));
  }, [setWebsocket]);

  useEffect(init, [init]);

  const { cookies } = useContext(CookiesContext);

  useEffect(() => {
    if (cookies.color == null) return;

    const color = Color.hex(cookies.color);
    websocket?.send(
      serializeMessage([
        MessageType.USER,
        0,
        color.h,
        color.s,
        color.l,
        true,
        cookies.username,
      ]),
    );
  }, [cookies.username, cookies.color]);

  const messageSemaphore = useRef(new Semaphore());

  const onMessage = useCallback(
    async (evt: MessageEvent) => {
      messageSemaphore.current.queue(async () => {
        const data = new Uint8Array(await evt.data.arrayBuffer());
        const msg = formatMessageData(deserializeMessage(data));

        if (msg.type === MessageType.ERROR) {
          const params = { errorId: query.id };
          if (msg.error === ErrorType.WRONG_PASS) params["wrongPass"] = true;
          return navigate(`/?${qs.stringify(params)}`);
        }

        messageListener(msg);
      });
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
