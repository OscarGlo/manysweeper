import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React, { useCallback, useContext, useRef } from "react";
import { useParams } from "react-router";
import { PasswordContext } from "../contexts/Password";
import { Box, IconButton, Paper, Stack } from "@mui/material";
import { GameProvider } from "../contexts/Game";
import { UserList } from "./UserList";
import People from "@mui/icons-material/People";
import Chat from "@mui/icons-material/Chat";
import { ChatBox } from "./ChatBox";
import { CookiesContext } from "../contexts/Cookies";
import { throttled } from "../../util/util";
import { useResizeObserver } from "../hooks/useResizeObserver";

export function Room() {
  const { id } = useParams();
  const { password } = useContext(PasswordContext);
  const { cookies, setCookie } = useContext(CookiesContext);

  const toggleUserList = useCallback(() => {
    setCookie("userListOpen", (prev) => (prev === "" ? "1" : ""));
  }, [setCookie]);

  const toggleChat = useCallback(() => {
    setCookie("chatOpen", (prev) => (prev === "" ? "1" : ""));
  }, [setCookie]);

  const sidebar = useRef<HTMLDivElement>();

  useResizeObserver(
    sidebar,
    throttled(
      () => setCookie("sidebarWidth", sidebar.current.offsetWidth + "px"),
      1000,
    ),
    [setCookie],
  );

  return (
    <WebSocketProvider query={{ id, password }}>
      <GameProvider>
        <Stack
          direction="row"
          sx={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {(cookies.userListOpen ?? true) || (cookies.chatOpen ?? true) ? (
            <Paper
              sx={{
                width: cookies.sidebarWidth ?? "200px",
                height: "100%",
                overflow: "hidden",
                resize: "horizontal",
                borderRadius: 0,
              }}
            >
              <Stack
                justifyItems="stretch"
                height="100%"
                overflow="hidden"
                ref={sidebar}
              >
                {(cookies.userListOpen ?? true) ? <UserList /> : null}
                {(cookies.chatOpen ?? true) ? <ChatBox /> : null}
              </Stack>
            </Paper>
          ) : null}

          <Stack padding={1}>
            <IconButton onClick={toggleUserList} sx={{ minHeight: 0 }}>
              <People
                color={
                  ((cookies.userListOpen ?? true) ? "primary" : "disabled") as
                    | "primary"
                    | "disabled"
                }
              />
            </IconButton>

            <IconButton onClick={toggleChat} sx={{ minHeight: 0 }}>
              <Chat
                color={
                  ((cookies.chatOpen ?? true) ? "primary" : "disabled") as
                    | "primary"
                    | "disabled"
                }
              />
            </IconButton>
          </Stack>

          <Box flex={1} overflow="auto" textAlign="center" paddingTop={6}>
            <GameBoard />
          </Box>
        </Stack>
      </GameProvider>
    </WebSocketProvider>
  );
}
