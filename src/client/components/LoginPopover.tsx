import React, { useCallback, useContext, useState } from "react";
import {
  Button,
  Popover,
  PopoverProps,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ColorInput } from "./ColorInput";
import { CookieInput } from "./CookieInput";
import { CookiesContext } from "../contexts/Cookies";

export function LoginPopover(props: PopoverProps): React.ReactElement {
  const { setCookie } = useContext(CookiesContext);

  const [username, setUsername] = useState("");
  const [color, setColor] = useState("");

  const onSubmit = useCallback(() => {
    setCookie("username", username);
    setCookie("color", color);
    props.onClose({}, "escapeKeyDown");
  }, [setCookie, username, color, props.onClose]);

  return (
    <Popover {...props} keepMounted>
      <Stack gap={2} sx={{ width: "200px", padding: 2 }}>
        <Typography fontSize="large" fontWeight="bold">
          Login
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

        <Button variant="contained" onClick={onSubmit}>
          Login
        </Button>
      </Stack>
    </Popover>
  );
}
