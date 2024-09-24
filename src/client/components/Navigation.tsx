import React, { useContext, useState } from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import { useToggle } from "../hooks/useToggle";
import { NavigationButton } from "./NavigationButton";
import { LoginPopover } from "./LoginPopover";
import { OptionsPopover } from "./OptionsPopover";
import { CookiesContext } from "../contexts/Cookies";
import { UserAvatar } from "./UserAvatar";

export function Navigation(): React.ReactElement {
  const { cookies } = useContext(CookiesContext);

  const [loginAnchor, setLoginAnchor] = useState<Element>();
  const [optionsAnchor, setOptionsAnchor] = useState<Element>();

  const [optionsOpen, toggleOptionsOpen] = useToggle();
  const [loginOpen, toggleLoginOpen] = useToggle();

  return (
    <AppBar position="static" sx={{ zIndex: 100 }}>
      <Toolbar>
        <Typography
          onClick={() => location.replace("/")}
          variant="h5"
          sx={{ cursor: "pointer" }}
        >
          ManySweeper
        </Typography>

        <NavigationButton
          icon={(props) =>
            cookies.username ? (
              <UserAvatar
                color={cookies.color}
                username={cookies.username}
                {...props}
                sx={{ marginRight: 1 }}
              />
            ) : (
              <PersonIcon {...props} />
            )
          }
          label="Login"
          sx={{ marginInlineStart: "auto" }}
          onClick={toggleLoginOpen}
          ref={setLoginAnchor}
        />

        <NavigationButton
          icon={SettingsIcon}
          label="Options"
          onClick={toggleOptionsOpen}
          ref={setOptionsAnchor}
        />
      </Toolbar>

      <OptionsPopover
        open={optionsOpen}
        anchorEl={optionsAnchor}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={toggleOptionsOpen}
      />
      <LoginPopover
        open={loginOpen}
        anchorEl={loginAnchor}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={toggleLoginOpen}
      />
    </AppBar>
  );
}
