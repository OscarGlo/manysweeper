import React, { useCallback, useContext, useState } from "react";
import {
  Button,
  CircularProgress,
  Popover,
  PopoverProps,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ColorInput } from "./ColorInput";
import { CookieInput } from "./CookieInput";
import { CookiesContext } from "../contexts/Cookies";
import { UserContext } from "../contexts/User";

const OAUTH_URL =
  "https://discord.com/oauth2/authorize" +
  "?client_id=1349493971608408224" +
  "&response_type=code" +
  "&redirect_uri=http%3A%2F%2Flocalhost%3A8443%2Fapi%2Fauth" +
  "&scope=identify";

export function LoginPopover(props: PopoverProps): React.ReactElement {
  const { setCookie } = useContext(CookiesContext);
  const { user, loading, refresh } = useContext(UserContext);

  const [username, setUsername] = useState("");
  const [color, setColor] = useState("");

  const onLogout = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" });
    refresh();
  }, []);

  const onGuestLogin = useCallback(() => {
    setCookie("username", username);
    setCookie("color", color);
    props.onClose({}, "escapeKeyDown");
  }, [setCookie, username, color, props.onClose]);

  return (
    <Popover {...props} keepMounted>
      <Stack gap={2} sx={{ width: "200px", padding: 2 }}>
        {loading ? (
          <CircularProgress />
        ) : user == null ? (
          <Button variant="contained" href={OAUTH_URL}>
            Login via Discord
          </Button>
        ) : (
          <Button variant="contained" color="error" onClick={onLogout}>
            Log out
          </Button>
        )}

        {!loading && user == null ? (
          <>
            <hr style={{ width: "100%" }} />

            <Typography fontSize="large" fontWeight="bold">
              Guest
            </Typography>

            <CookieInput
              cookieName="username"
              defaultValue=""
              dynamic={false}
              onChange={setUsername}
              render={({ value, onChange }) => (
                <TextField
                  label="Username"
                  size="small"
                  inputProps={{ maxLength: 24 }}
                  value={value}
                  onChange={(evt) => onChange(evt.target.value)}
                />
              )}
            />

            <CookieInput
              cookieName="color"
              defaultValue="#ff0000"
              dynamic={false}
              onChange={setColor}
              render={({ value, onChange }) => (
                <ColorInput
                  label="Flag color"
                  size="small"
                  value={value}
                  onChange={(evt) => onChange(evt.target.value)}
                />
              )}
            />

            <Button variant="contained" onClick={onGuestLogin}>
              Guest login
            </Button>
          </>
        ) : null}
      </Stack>
    </Popover>
  );
}
