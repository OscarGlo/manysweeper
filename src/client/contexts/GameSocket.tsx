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
import { GameWebSocketQuery } from "../../model/wsQueries";
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
import { UserContext } from "./User";
import { useWebSocket } from "../hooks/useWebSocket";

export interface GameSocketValue {
  websocket?: WebSocket;
  setMessageListener: (listener: (msg: Message) => void) => void;
}

export const GameSocketContext = createContext<GameSocketValue>({
  setMessageListener: () => {},
});

export interface GameSocketProviderProps extends WithChildren {
  query?: GameWebSocketQuery;
}

export function GameSocketProvider({
  children,
  query,
}: GameSocketProviderProps) {
  const navigate = useNavigate();
  const [messageListener, setMessageListener] =
    useState<(msg: Message) => void>();

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

  const { websocket } = useWebSocket(query, onMessage);

  const { cookies } = useContext(CookiesContext);
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (user == null && cookies.color == null) return;

    const color = user ? Color.hex(user.color) : Color.hex(cookies.color);
    websocket?.send(
      serializeMessage([
        MessageType.USER,
        0,
        color.h,
        color.s,
        color.l,
        true,
        user?.name ?? cookies.username,
      ]),
    );
  }, [user, cookies.username, cookies.color]);

  return (
    <GameSocketContext.Provider
      value={{
        websocket,
        setMessageListener: (value) => setMessageListener(() => value),
      }}
    >
      {children}
    </GameSocketContext.Provider>
  );
}
