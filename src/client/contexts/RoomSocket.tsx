import React, { createContext, useCallback, useContext } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { WithChildren } from "../util/WithChildren";
import { RoomInfo } from "../../model/RoomInfo";
import { RoomsContext } from "./Rooms";

export interface RoomSocketValue {
  websocket?: WebSocket;
}

export interface RoomSocketProviderProps extends WithChildren {}

export const RoomSocketContext = createContext<RoomSocketValue>({});

export function RoomSocketProvider({ children }: RoomSocketProviderProps) {
  const { rooms, setRooms } = useContext(RoomsContext);

  const onMessage = useCallback(
    (message: MessageEvent) => {
      const data = JSON.parse(message.data) as Partial<RoomInfo>;

      const exists = rooms.some((r) => r.id === data.id);

      if (data.open === true && !exists) {
        setRooms([...rooms, data as RoomInfo]);
      } else if (data.open === false) {
        setRooms([...rooms.filter((r) => r.id !== data.id)]);
      } else {
        const i = rooms.findIndex((r) => r.id === data.id);
        const updated = Object.assign(rooms[i], data);
        setRooms([
          ...rooms.slice(0, i),
          updated,
          ...rooms.slice(i + 1, rooms.length),
        ]);
      }
    },
    [rooms, setRooms],
  );

  const { websocket } = useWebSocket({ room: 1 }, onMessage);

  return (
    <RoomSocketContext.Provider value={{ websocket }}>
      {children}
    </RoomSocketContext.Provider>
  );
}
