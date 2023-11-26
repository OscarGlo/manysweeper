import React, { FormEvent, useCallback, useContext, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CreateRoom } from "../../model/CreateRoom";
import { CookiesContext } from "../contexts/Cookies";
import { GameState } from "../../model/GameState";
import { Room } from "../../model/Room";

export interface CreateRoomDialogProps {
  open: boolean;
  onSubmit: (data: CreateRoom) => void;
  onClose: () => void;
}

export enum Level {
  BEGGINER,
  INTERMEDIATE,
  EXPERT,
  CUSTOM,
}

export function CreateRoomDialog({
  onSubmit,
  ...props
}: CreateRoomDialogProps): React.ReactElement {
  const { cookies } = useContext(CookiesContext);

  const [name, setName] = useState(
    cookies.username ? `${cookies.username}'s room` : "New room",
  );
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(16);
  const [mines, setMines] = useState(99);
  const [level, setLevel] = useState(Level.EXPERT);

  const submit = useCallback(
    (evt: FormEvent) => {
      evt.preventDefault();
      onSubmit({ name, width, height, mines });
      props.onClose();
    },
    [onSubmit, name, width, height, mines, props.onClose],
  );

  const updateDifficulty = useCallback(
    (level: Level) => {
      setLevel(level);
      switch (level) {
        case Level.BEGGINER:
          setWidth(9);
          setHeight(9);
          setMines(10);
          break;

        case Level.INTERMEDIATE:
          setWidth(16);
          setHeight(16);
          setMines(40);
          break;

        case Level.EXPERT:
          setWidth(30);
          setHeight(16);
          setMines(99);
          break;
      }
    },
    [setLevel],
  );

  return (
    <Dialog {...props}>
      <form onSubmit={submit}>
        <Stack gap={2} sx={{ padding: 2 }}>
          <Typography fontSize="large" fontWeight="bold">
            New room
          </Typography>

          <TextField
            label="Name"
            size="small"
            fullWidth
            inputProps={{ maxLength: Room.MAX_NAME_LENGTH }}
            value={name}
            onChange={(evt) => setName(evt.target.value)}
          />

          <Box>
            <Typography fontSize="medium" fontWeight="bold">
              Difficulty settings
            </Typography>

            <RadioGroup
              value={level}
              onChange={(_, value) => updateDifficulty(parseInt(value))}
              row
            >
              <FormControlLabel
                label="Beginner"
                value={Level.BEGGINER}
                control={<Radio />}
              />
              <FormControlLabel
                label="Intermediate"
                value={Level.INTERMEDIATE}
                control={<Radio />}
              />
              <FormControlLabel
                label="Expert"
                value={Level.EXPERT}
                control={<Radio />}
              />
              <FormControlLabel
                label="Custom"
                value={Level.CUSTOM}
                control={<Radio />}
              />
            </RadioGroup>
          </Box>

          <Grid container spacing={2} width="100%">
            <Grid item xs={6}>
              <TextField
                label="Width"
                type="number"
                size="small"
                fullWidth
                inputProps={{
                  min: GameState.MIN_WIDTH,
                  max: GameState.MAX_WIDTH,
                  required: true,
                }}
                value={width}
                onChange={(evt) => {
                  setLevel(Level.CUSTOM);
                  setWidth(parseInt(evt.target.value));
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Height"
                type="number"
                size="small"
                fullWidth
                inputProps={{
                  min: GameState.MIN_HEIGHT,
                  max: GameState.MAX_HEIGHT,
                  required: true,
                }}
                value={height}
                onChange={(evt) => {
                  setLevel(Level.CUSTOM);
                  setHeight(parseInt(evt.target.value));
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Mine count"
                type="number"
                size="small"
                fullWidth
                inputProps={{ min: 1, max: 500, required: true }}
                value={mines}
                onChange={(evt) => {
                  setLevel(Level.CUSTOM);
                  setMines(parseInt(evt.target.value));
                }}
              />
            </Grid>
          </Grid>

          <Button type="submit">Create</Button>
        </Stack>
      </form>
    </Dialog>
  );
}
