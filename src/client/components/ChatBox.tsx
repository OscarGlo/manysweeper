import React, {
  KeyboardEventHandler,
  useCallback,
  useContext,
  useState,
} from "react";
import { Paper, Stack, TextField, Typography } from "@mui/material";
import { GameContext } from "../contexts/Game";
import { WebSocketContext } from "../contexts/WebSocket";
import { MessageType, serializeMessage } from "../../model/messages";
import { useInterval } from "../hooks/useInterval";

export function ChatBox(): React.ReactElement {
  const { websocket } = useContext(WebSocketContext);
  const { game } = useContext(GameContext);

  const [chat, setChat] = useState([...game.chat]);

  useInterval(
    () => {
      if (game.chat.length !== chat.length) setChat([...game.chat]);
    },
    100,
    [game, chat, setChat],
  );

  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (evt) => {
      if (evt.key === "Enter") {
        const input = evt.target as HTMLInputElement;
        websocket.send(serializeMessage([MessageType.CHAT, 0, input.value]));
        input.value = "";
      }
    },
    [websocket],
  );

  return (
    <Paper sx={{ borderRadius: 0, flex: 1, minHeight: 0 }}>
      <Stack height="100%">
        <Stack flex={1} padding={1} overflow="auto">
          {chat.map((msg, i) => (
            <Typography key={msg.user.username + msg.message + i}>
              <Typography
                component="span"
                color={msg.user.color.hex}
                fontWeight="bold"
              >
                {msg.user.username}
              </Typography>
              : {msg.message}
            </Typography>
          ))}
        </Stack>

        <TextField
          placeholder="Send message..."
          variant="standard"
          sx={{ width: "100%", padding: 1 }}
          onKeyDown={onKeyDown}
        />
      </Stack>
    </Paper>
  );
}
