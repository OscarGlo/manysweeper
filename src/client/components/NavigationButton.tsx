import { Button, ButtonProps, IconButton, Tooltip } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import React, { useContext } from "react";
import { NavigationContext } from "./Navigation";

export interface NavigationButtonProps extends ButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: OverridableComponent<any>;
  label: string;
}

export function NavigationButton({
  icon: Icon,
  label,
  ...props
}: NavigationButtonProps) {
  const { open } = useContext(NavigationContext);

  return (
    <Tooltip title={label} enterDelay={500} placement="left">
      {open ? (
        <Button
          variant="text"
          {...props}
          sx={{
            display: "flex",
            justifyContent: "start",
            gap: 1,
            height: "40px",
            width: "100%",
            ...props.sx,
          }}
        >
          <Icon /> {label}
        </Button>
      ) : (
        <IconButton color="primary" {...props}>
          <Icon />
        </IconButton>
      )}
    </Tooltip>
  );
}
