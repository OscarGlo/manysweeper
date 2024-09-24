import React from "react";
import { Avatar, AvatarProps } from "@mui/material";

export interface UserAvatarProps extends AvatarProps {
  username?: string;
}

export function UserAvatar({
  username,
  ...props
}: UserAvatarProps): React.ReactElement {
  const parts = username?.split(/\s+/);
  return (
    <Avatar {...props} sx={{ backgroundColor: props.color, ...props.sx }}>
      {parts[0]?.[0]?.toUpperCase()}
      {parts[1]?.[0]?.toUpperCase()}
    </Avatar>
  );
}
