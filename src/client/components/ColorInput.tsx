import { Input, OutlinedInput, OutlinedInputProps } from "@mui/material";
import React from "react";

export interface ColorInputProps extends Omit<OutlinedInputProps, "onChange"> {
  onChange?: (value: string) => void;
}

export function ColorInput({ onChange, ...props }: ColorInputProps) {
  return (
    <Input
      slots={{
        input: () => (
          <OutlinedInput
            {...props}
            onChange={(evt) => {
              onChange?.(evt.target.value);
            }}
            type="color"
          />
        ),
      }}
    />
  );
}
