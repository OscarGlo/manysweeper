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
    <Avatar {...props}>
      {parts[0]?.[0]}
      {parts[1]?.[0]}
    </Avatar>
  );
}
