import React, { useContext } from "react";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Popover,
  PopoverProps,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { AppThemeContext } from "../contexts/AppTheme";
import { SkinContext } from "../contexts/Skin";
import { CookieInput } from "./CookieInput";

export function Options(props: PopoverProps): React.ReactElement {
  const { setMode } = useContext(AppThemeContext);
  const { skin } = useContext(SkinContext);

  return (
    <Popover {...props} keepMounted>
      <Stack component="form" gap={2} sx={{ width: "200px", padding: 2 }}>
        <Typography fontSize="large">Options</Typography>

        <CookieInput
          cookieName="skin"
          defaultValue="classic"
          onChange={(name: string) => skin.load(name)}
          render={({ value, onChange }) => (
            <FormControl>
              <InputLabel>Skin</InputLabel>
              <Select
                size="small"
                label="Skin"
                value={value}
                onChange={(evt) => onChange(evt.target.value)}
              >
                <MenuItem value="classic">Classic</MenuItem>
                <MenuItem value="classic_dark">Classic dark</MenuItem>
              </Select>
            </FormControl>
          )}
        />

        <CookieInput
          cookieName="darkMode"
          defaultValue={false}
          onChange={setMode}
          parse={(cookie: string) => cookie === "true"}
          render={({ value, onChange }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={value}
                  onChange={(evt) => onChange(evt.target.checked)}
                />
              }
              label="Dark mode"
            />
          )}
        />
      </Stack>
    </Popover>
  );
}
