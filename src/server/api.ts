import express from "express";
import { rooms, roomId } from "./main";
import { Room } from "../model/Room";
import { RoomInfo } from "../model/RoomInfo";
import bcrypt from "bcryptjs";

const router = express.Router();

function serializeRoom(id: number, room: Room): RoomInfo {
  return {
    id,
    name: room.name,
    private: room.private,
    players: Object.values(room.game.users).length.toString(),
    board: `${room.game.width}×${room.game.height} (${room.game.mineCount})`,
  };
}

router
  .get("/rooms", (req, res) => {
    res.send(
      Object.entries(rooms).map(([id, room]) =>
        serializeRoom(parseInt(id), room),
      ),
    );
  })
  .post("/rooms", (req, res) => {
    const id = roomId.get();
    const room = new Room(req.body);
    rooms[id] = room;
    room.timeout = setTimeout(() => delete rooms[id], Room.TIMEOUT);
    res.send(serializeRoom(id, room));
  })
  .post("/rooms/:id", async (req, res) => {
    const room = rooms[req.params.id];
    res.sendStatus(
      room == null
        ? 404
        : (await bcrypt.compare(req.body.password, room.passwordHash))
        ? 200
        : 403,
    );
  });

export default router;
