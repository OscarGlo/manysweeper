import React, { ChangeEvent, useCallback, useEffect } from "react";
import { Box, MenuItem, Select } from "@mui/material";
import cookie from "cookie";
import { skin } from "../board/render";
import { MuiColorInput } from "mui-color-input";

export function Options(): React.ReactElement {
  const cookies = cookie.parse(document.cookie ?? "");

  useEffect(() => {
    if (cookies.skin) {
      const skinSelect = document.getElementsByName(
        "skin",
      )[0] as HTMLSelectElement;
      skinSelect.value = cookies.skin;
      skin.load(skinSelect.value);
    }

    if (cookies.bgColor) {
      const bgColor = document.getElementsByName(
        "bgColor",
      )[0] as HTMLSelectElement;
      bgColor.value = cookies.bgColor;
      document.body.style.backgroundColor = bgColor.value;
    }
  }, []);

  const changeSkin = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    cookies.skin = evt.target.value;
    document.cookie = cookie.serialize("skin", cookies.skin);
    skin.load(cookies.skin);
  }, []);

  const setBgColor = useCallback((value: string) => {
    cookies.bgColor = value;
    document.cookie = cookie.serialize("bgColor", value);
    document.body.style.backgroundColor = value;
  }, []);

  return (
    <Box display="flex" flexDirection="column" padding={2}>
      <Select label="skin" onChange={changeSkin}>
        <MenuItem value="classic">Classic</MenuItem>
        <MenuItem value="classic_dark">Classic dark</MenuItem>
      </Select>
      <MuiColorInput
        name="bgColor"
        onChange={setBgColor}
        label="Background color"
        value="#ffffff"
      />
    </Box>
  );
}
