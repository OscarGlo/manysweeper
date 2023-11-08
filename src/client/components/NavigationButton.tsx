import { Button, ButtonProps, Tooltip } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import React from "react";

export interface NavigationButtonProps extends ButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: OverridableComponent<any>;
  label: string;
}

export const NavigationButton = React.forwardRef<
  HTMLButtonElement,
  NavigationButtonProps
>(({ icon: Icon, label, ...props }: NavigationButtonProps, ref) => {
  return (
    <Tooltip title={label} enterDelay={500}>
      <Button color="inherit" variant="text" ref={ref} {...props}>
        <Icon sx={{ marginRight: 1 }} /> {label}
      </Button>
    </Tooltip>
  );
});
