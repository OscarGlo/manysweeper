import React, { FormEvent, useCallback, useContext, useState } from "react";
import { Button, Dialog, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { RoomInfo } from "../../model/RoomInfo";
import { PasswordContext } from "../contexts/Password";
import { post } from "../util/post";

interface PasswordDialogProps {
  onClose: () => void;
  open: boolean;
  room: RoomInfo;
}

export function PasswordDialog({ room, ...props }: PasswordDialogProps) {
  const navigate = useNavigate();

  const { setPassword: setContextPassword } = useContext(PasswordContext);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  const submit = useCallback(
    async (evt: FormEvent) => {
      evt.preventDefault();
      const res = await post(`/api/rooms/${room?.id}`, { password });

      if (res.status === 200) {
        setContextPassword(password);
        navigate(`/room/${room?.id}`);
      } else {
        setError(
          res.status === 404
            ? `Room ${room?.id} not found`
            : "Invalid password",
        );
      }
    },
    [room, password, setContextPassword, navigate, setError],
  );

  return (
    <Dialog {...props}>
      <form onSubmit={submit}>
        <Stack gap={2} sx={{ padding: 2 }}>
          <Typography fontSize="large" fontWeight="bold">
            Password for {room?.name}
          </Typography>

          <TextField
            size="small"
            type="password"
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
            error={error != null}
            helperText={error}
          />

          <Button type="submit" variant="contained">
            Submit
          </Button>
        </Stack>
      </form>
    </Dialog>
  );
}
