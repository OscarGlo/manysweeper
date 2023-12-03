import React from "react";
import { Box, BoxProps } from "@mui/material";

export function Center({ children, ...props }: BoxProps) {
  return (
    <Box
      flex={1}
      display="flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      {children}
    </Box>
  );
}
