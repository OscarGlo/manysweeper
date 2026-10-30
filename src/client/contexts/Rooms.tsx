import React, {
  createContext,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RoomInfo } from "../../model/RoomInfo";
import { WithChildren } from "../util/WithChildren";

export interface RoomContextValue {
  rooms: RoomInfo[];
  setRooms: (rooms: RoomInfo[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const RoomsContext = createContext<RoomContextValue>({
  rooms: [],
  setRooms: () => {},
  loading: true,
  setLoading: () => {},
});

export interface RoomsProviderProps extends WithChildren {}

export function RoomsProvider({ children }: RoomsProviderProps): ReactElement {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((rooms) => {
        setRooms(rooms);
        setLoading(false);
      });
  }, [setRooms]);

  useEffect(loadRooms, [loadRooms]);

  return (
    <RoomsContext.Provider value={{ rooms, setRooms, loading, setLoading }}>
      {children}
    </RoomsContext.Provider>
  );
}
