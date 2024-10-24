import React, { FormEvent, useCallback, useContext, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import { CreateRoom } from "../../model/CreateRoom";
import { CookiesContext } from "../contexts/Cookies";
import { GameState, GuessLevel } from "../../model/GameState";
import { Room } from "../../model/Room";
import { MatrixType } from "../../util/Matrix";

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
  const [priv, setPriv] = useState(false);
  const [password, setPassword] = useState<string>();
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(16);
  const [mines, setMines] = useState(99);
  const [level, setLevel] = useState(Level.EXPERT);
  const [type, setType] = useState(MatrixType.SQUARE);
  const [guessLevel, setGuessLevel] = useState(GuessLevel.None);

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
      <form
        onSubmit={(evt: FormEvent) => {
          evt.preventDefault();
          onSubmit({
            name,
            password,
            width,
            height,
            mines,
            type,
            guessLevel,
          });
          props.onClose();
        }}
      >
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

          <Stack direction="row" gap={2}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={priv}
              onChange={(_, priv) => {
                setPriv(priv);
                if (!priv) setPassword(undefined);
              }}
            >
              <ToggleButton value={false}>
                <PublicIcon />
              </ToggleButton>

              <ToggleButton value={true}>
                <LockIcon />
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label="Password"
              size="small"
              type="password"
              fullWidth
              disabled={!priv}
              value={password ?? ""}
              onChange={(evt) => setPassword(evt.target.value || undefined)}
            />
          </Stack>

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
                inputProps={{ min: 1, max: width * height - 1, required: true }}
                value={mines}
                onChange={(evt) => {
                  setLevel(Level.CUSTOM);
                  setMines(parseInt(evt.target.value));
                }}
              />
            </Grid>

            <Grid
              item
              display="flex"
              justifyContent="center"
              alignItems="center"
              xs={6}
            >
              <Typography>
                Mine density: {Math.floor((100 * mines) / (width * height))}%
              </Typography>
            </Grid>
          </Grid>

          <Typography fontSize="medium" fontWeight="bold">
            Variants
          </Typography>

          <Grid container spacing={2} width="100%">
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>No guessing level</InputLabel>
                <Select
                  size="small"
                  label="No guessing level"
                  value={guessLevel}
                  onChange={(evt) =>
                    setGuessLevel(evt.target.value as GuessLevel)
                  }
                >
                  <MenuItem value={GuessLevel.None}>None (random)</MenuItem>
                  <MenuItem value={GuessLevel.Easy}>Easy</MenuItem>
                  <MenuItem value={GuessLevel.Medium}>Medium</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Tile type</InputLabel>
                <Select
                  size="small"
                  label="Tile type"
                  value={type}
                  onChange={(evt) => setType(evt.target.value as MatrixType)}
                >
                  <MenuItem value={MatrixType.SQUARE}>Square</MenuItem>
                  <MenuItem value={MatrixType.HEX}>Hexagonal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button type="submit">Create</Button>
        </Stack>
      </form>
    </Dialog>
  );
}
