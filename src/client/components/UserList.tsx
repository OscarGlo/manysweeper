import React, { useContext, useRef, useState } from "react";
import {
  alpha,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { GameContext } from "../contexts/Game";
import { UserAvatar } from "./UserAvatar";
import { useInterval } from "../hooks/useInterval";
import { arraysEqual } from "../util/arraysEqual";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { throttled } from "../../util/util";
import { CookiesContext } from "../contexts/Cookies";
import { Gamemode } from "../../model/GameState";

export function UserList(): React.ReactElement {
  const theme = useTheme();
  const { game } = useContext(GameContext);
  const { cookies, setCookie } = useContext(CookiesContext);

  const [users, setUsers] = useState({ ...game.users });
  const [current, setCurrent] = useState(null);
  const [init, setInit] = useState(false);
  useInterval(
    () => {
      if (
        !arraysEqual(
          (u) => u.username + " " + u.color.hex + " " + u.score,
          Object.values(game.users),
          Object.values(users),
        )
      )
        setUsers({ ...game.users });

      if (game.currentPlayer !== current) setCurrent(game.currentPlayer);

      if (game.init && !init) setInit(true);
    },
    100,
    [game, current, setCurrent, users, setUsers, init, setInit],
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
              sx={{
                gap: 1,
                padding: 1,
                paddingX: 2,
                background:
                  user.id === current
                    ? alpha(theme.palette.text.primary, 0.2)
                    : undefined,
              }}
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
                flex={1}
              >
                {user.username}
              </Typography>
              {game != null && game.gamemode === Gamemode.FLAGS ? (
                <Typography fontWeight="bold">{user.score}</Typography>
              ) : null}
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
