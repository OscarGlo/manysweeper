import React, { useContext, useState } from "react";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { GameContext } from "../contexts/Game";
import { UserAvatar } from "./UserAvatar";
import { useInterval } from "../hooks/useInterval";

export function UserList(): React.ReactElement {
  const { game } = useContext(GameContext);

  const [users, setUsers] = useState({ ...game.users });
  const [init, setInit] = useState(false);
  useInterval(
    () => {
      if (Object.values(game.users).length !== Object.values(users).length)
        setUsers({ ...game.users });

      if (game.init && !init) setInit(true);
    },
    100,
    [game, users, setUsers],
  );

  return (
    <Paper
      sx={{
        width: "200px",
        height: "100%",
        overflow: "auto",
        resize: "horizontal",
        borderRadius: 0,
      }}
    >
      <Typography variant="h6" sx={{ marginTop: 1, marginLeft: 2 }}>
        Users
      </Typography>
      {game.init ? null : (
        <Box width="100%" textAlign="center" sx={{ marginTop: 1 }}>
          <CircularProgress size="32px" />
        </Box>
      )}
      <Stack>
        {Object.values(users).map((user, i) => (
          <Stack
            direction="row"
            alignItems="center"
            sx={{ gap: 1, margin: 1, marginLeft: 2 }}
            key={user.username + i}
          >
            <UserAvatar color={user.color.hex} username={user.username} />
            <Typography
              sx={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.username}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
