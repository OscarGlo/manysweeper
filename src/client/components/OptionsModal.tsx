import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Dialog,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { skin } from "../board/render";
import CloseIcon from "@mui/icons-material/Close";
import { CookiesContext } from "../contexts/Cookies";
import { ColorInput } from "./ColorInput";
import { AppThemeContext } from "../contexts/AppTheme";

export interface OptionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function OptionsModal(props: OptionsModalProps): React.ReactElement {
  const { cookies, setCookie } = useContext(CookiesContext);
  const { setBackgroundColor } = useContext(AppThemeContext);
  const theme = useTheme();

  const [skinName, setSkin] = useState("classic");

  useEffect(() => {
    if (cookies.skin) {
      setSkin(cookies.skin);
      skin.load(cookies.skin);
    }

    if (cookies.bgColor) setBackgroundColor(cookies.bgColor);
  }, [setSkin, setBackgroundColor]);

  const changeSkin = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => {
      setCookie("skin", evt.target.value);
      skin.load(evt.target.value);
    },
    [setCookie],
  );

  const changeBgColor = useCallback(
    (value: string) => {
      setCookie("bgColor", value);
      setBackgroundColor(value);
    },
    [setCookie],
  );

  return (
    <Dialog {...props}>
      <Stack
        component="form"
        gap={2}
        sx={{ width: "200px", padding: 2, paddingTop: 1 }}
      >
        <Stack direction="row" alignItems="center">
          <Typography fontSize="large">Options</Typography>

          <IconButton
            onClick={props.onClose}
            sx={{ marginLeft: "auto", padding: 0 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        <FormControl>
          <InputLabel>Skin</InputLabel>
          <Select
            size="small"
            label="Skin"
            defaultValue={skinName}
            onChange={changeSkin}
          >
            <MenuItem value="classic">Classic</MenuItem>
            <MenuItem value="classic_dark">Classic dark</MenuItem>
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel htmlFor="bgColor">Background color</InputLabel>
          <ColorInput
            id="bgColor"
            label="Background color"
            defaultValue={theme.palette.background.default}
            onChange={changeBgColor}
            size="small"
            fullWidth
          />
        </FormControl>
      </Stack>
    </Dialog>
  );
}
