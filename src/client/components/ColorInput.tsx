import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  OutlinedInputProps,
  Typography,
} from "@mui/material";
import React, { ChangeEvent, useCallback, useState } from "react";
import { throttled } from "../../util/util";

function ColorInputInternal(props: OutlinedInputProps): React.ReactElement {
  const [value, setValue] = useState<string>(props.value as string | undefined);
  const getValue = useCallback(
    (elt: HTMLInputElement) => setValue(elt?.value),
    [setValue],
  );

  const onChange = useCallback(
    throttled((evt: ChangeEvent<HTMLInputElement>) => {
      if (evt.target != null) {
        setValue(evt.target.value);
        props.onChange?.(evt);
      }
    }, 100),
    [setValue, props],
  );

  return (
    <OutlinedInput
      {...props}
      type="color"
      inputRef={getValue}
      endAdornment={
        <>
          <InputAdornment position="end">
            <Typography sx={{ fontFamily: '"Roboto Mono", monospaced' }}>
              {value}
            </Typography>
          </InputAdornment>
          {props.endAdornment}
        </>
      }
      onChange={onChange}
    />
  );
}

export function ColorInput(props: OutlinedInputProps): React.ReactElement {
  console.log("ColorInput rerender");

  return props.label ? (
    <FormControl>
      <InputLabel>{props.label}</InputLabel>
      <ColorInputInternal {...props} />
    </FormControl>
  ) : (
    <ColorInputInternal {...props} />
  );
}
