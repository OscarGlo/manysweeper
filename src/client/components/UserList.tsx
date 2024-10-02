import React, { useContext, useRef, useState } from "react";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { GameContext } from "../contexts/Game";
import { UserAvatar } from "./UserAvatar";
import { useInterval } from "../hooks/useInterval";
import { arraysEqual } from "../util/arraysEqual";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { throttled } from "../../util/util";
import { CookiesContext } from "../contexts/Cookies";

export function UserList(): React.ReactElement {
  const { game } = useContext(GameContext);
  const { cookies, setCookie } = useContext(CookiesContext);

  const [users, setUsers] = useState({ ...game.users });
  const [init, setInit] = useState(false);
  useInterval(
    () => {
      if (
        !arraysEqual(
          (u) => u.username + " " + u.color.hex,
          Object.values(game.users),
          Object.values(users),
        )
      )
        setUsers({ ...game.users });

      if (game.init && !init) setInit(true);
    },
    100,
    [game, users, setUsers],
  );

  const container = useRef<HTMLDivElement>();

  useResizeObserver(
    container,
    throttled(
      () => setCookie("userListHeight", container.current.offsetHeight + "px"),
      1000,
    ),
    [setCookie],
  );

  return (
    <Paper
      sx={{
        height: cookies.userListHeight ?? "300px",
        overflow: "auto",
        resize: "vertical",
        borderRadius: 0,
        zIndex: 10,
      }}
      ref={container}
    >
      <Typography variant="h6" sx={{ marginTop: 1, marginLeft: 2 }}>
        Users
      </Typography>
      {init ? (
        <Stack>
          {Object.values(users).map((user, i) => (
            <Stack
              direction="row"
              alignItems="center"
              sx={{ gap: 1, marginTop: 1, marginLeft: 2 }}
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
      ) : (
        <Box width="100%" textAlign="center" sx={{ marginTop: 1 }}>
          <CircularProgress size="32px" />
        </Box>
      )}
    </Paper>
  );
}
