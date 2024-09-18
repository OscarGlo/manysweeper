import React, { useContext, useEffect, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { GameContext } from "../contexts/Game";
import { UserAvatar } from "./UserAvatar";

export function UserList(): React.ReactElement {
  const { game } = useContext(GameContext);
  const [time, setTime] = useState(() => Math.floor(Date.now()) / 1000);

  useEffect(() => {
    const interval = setInterval(
      () => setTime(Math.floor(Date.now()) / 1000),
      1000,
    );
    return () => clearInterval(interval);
  });

  return (
    <Stack key={time}>
      {Object.values(game.users).map((user) => (
        <Stack direction="row">
          <UserAvatar color={user.color.hex} username={user.username} />
          <Typography>{user.username}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
