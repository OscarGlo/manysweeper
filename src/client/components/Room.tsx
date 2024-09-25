import { GameBoard } from "./GameBoard";
import { WebSocketProvider } from "../contexts/WebSocket";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { PasswordContext } from "../contexts/Password";
import { Box, IconButton, Paper, Stack } from "@mui/material";
import { GameProvider } from "../contexts/Game";
import { UserList } from "./UserList";
import { useToggle } from "../hooks/useToggle";
import People from "@mui/icons-material/People";
import Chat from "@mui/icons-material/Chat";
import { ChatBox } from "./ChatBox";

export function Room() {
  const { id } = useParams();
  const { password } = useContext(PasswordContext);

  const [userListOpen, toggleUserList] = useToggle(true);
  const [chatOpen, toggleChat] = useToggle(true);

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
          {userListOpen || chatOpen ? (
            <Paper
              sx={{
                width: "200px",
                height: "100%",
                overflow: "hidden",
                resize: "horizontal",
                borderRadius: 0,
              }}
            >
              <Stack justifyItems="stretch" height="100%" overflow="hidden">
                {userListOpen ? <UserList /> : null}
                {chatOpen ? <ChatBox /> : null}
              </Stack>
            </Paper>
          ) : null}

          <Stack padding={1}>
            <IconButton onClick={toggleUserList} sx={{ minHeight: 0 }}>
              <People
                color={
                  (userListOpen ? "primary" : "disabled") as
                    | "primary"
                    | "disabled"
                }
              />
            </IconButton>

            <IconButton onClick={toggleChat} sx={{ minHeight: 0 }}>
              <Chat
                color={
                  (chatOpen ? "primary" : "disabled") as "primary" | "disabled"
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
