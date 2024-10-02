import React, {
  KeyboardEventHandler,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Box, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { GameContext } from "../contexts/Game";
import { WebSocketContext } from "../contexts/WebSocket";
import { MessageType, serializeMessage } from "../../model/messages";
import { useInterval } from "../hooks/useInterval";
import { ChatMessageType } from "../../model/GameState";

export function ChatBox(): React.ReactElement {
  const { websocket } = useContext(WebSocketContext);
  const { game } = useContext(GameContext);

  const [chat, setChat] = useState([...game.chat]);

  const scrollerRef = useRef<HTMLDivElement>();
  const isChatScrolled = useCallback(
    () =>
      scrollerRef?.current &&
      scrollerRef.current.scrollTop ===
        scrollerRef.current.scrollHeight - scrollerRef.current.offsetHeight,
    [scrollerRef],
  );
  const scrollChat = () => {
    scrollerRef.current.scrollTop =
      scrollerRef.current.scrollHeight - scrollerRef.current.offsetHeight;
  };

  const [shouldScroll, setShouldScroll] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useInterval(
    () => {
      if (game.chat.length !== chat.length) {
        setChat([...game.chat]);

        if (isChatScrolled()) setShouldScroll(true);
        else setShowNew(true);
      }

      if (isChatScrolled() && showNew) setShowNew(false);
    },
    100,
    [game, chat, setChat, isChatScrolled, setShouldScroll, showNew, setShowNew],
  );

  // Scroll to bottom of chat scroller on rerender
  useLayoutEffect(() => {
    if (shouldScroll && scrollerRef.current) {
      setShouldScroll(false);
      scrollChat();
    }
  }, [shouldScroll, setShouldScroll, scrollerRef]);

  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (evt) => {
      if (evt.key === "Enter") {
        const input = evt.target as HTMLInputElement;
        if (input.value.match(/\S/)) {
          websocket.send(
            serializeMessage([MessageType.CHAT, 0, input.value.trim()]),
          );
          scrollChat();
        }
        input.value = "";
      }
    },
    [websocket],
  );

  return (
    <Paper sx={{ borderRadius: 0, flex: 1, minHeight: 0 }}>
      <Stack height="100%">
        <Box flex={1} height="100%" overflow="hidden" position="relative">
          <Stack
            padding={1}
            height="100%"
            ref={scrollerRef}
            sx={{
              wordBreak: "break-word",
              overflowX: "hidden",
            }}
          >
            {chat.map((msg, i) => (
              <Typography
                key={msg.user.username + msg.message + i}
                textAlign="left"
                color={msg.message ? undefined : "gray"}
              >
                {msg.oldUser ? (
                  <>
                    <Typography
                      component="span"
                      color={msg.oldUser.color.hex}
                      fontWeight="bold"
                    >
                      {msg.oldUser.username}
                    </Typography>
                    {" was updated to "}
                  </>
                ) : null}
                <Typography
                  component="span"
                  color={msg.user.color.hex}
                  fontWeight="bold"
                >
                  {msg.user.username}
                </Typography>
                {msg.message
                  ? `: ${msg.message}`
                  : msg.type === ChatMessageType.JOIN
                    ? ` joined the room.`
                    : msg.type === ChatMessageType.LEAVE
                      ? ` left the room.`
                      : "."}
              </Typography>
            ))}
          </Stack>

          {showNew && (
            <Chip
              label="New messages"
              sx={{
                position: "absolute",
                width: "120px",
                left: 0,
                right: 0,
                bottom: "8px",
                marginX: "auto",
              }}
            />
          )}
        </Box>

        <TextField
          placeholder="Send message..."
          variant="standard"
          inputProps={{ maxLength: 256 }}
          sx={{ width: "100%", padding: 1 }}
          onKeyDown={onKeyDown}
        />
      </Stack>
    </Paper>
  );
}
