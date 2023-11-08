import React, { useContext, useState } from "react";
import { AppBar, Avatar, Toolbar, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import { useToggle } from "../hooks/useToggle";
import { NavigationButton } from "./NavigationButton";
import { Login } from "./Login";
import { Options } from "./Options";
import { CookiesContext } from "../contexts/Cookies";

export function Navigation(): React.ReactElement {
  const { cookies } = useContext(CookiesContext);

  const [loginAnchor, setLoginAnchor] = useState<Element>();
  const [optionsAnchor, setOptionsAnchor] = useState<Element>();

  const [optionsOpen, toggleOptionsOpen] = useToggle();
  const [loginOpen, toggleLoginOpen] = useToggle();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h5">ManySweeper</Typography>

        <NavigationButton
          icon={(props) =>
            cookies.username ? (
              <Avatar
                {...props}
                sx={{ bgcolor: cookies.color, marginRight: 1 }}
              >
                {cookies.username?.split(" ")[0]?.[0]}
                {cookies.username?.split(" ")[1]?.[0]}
              </Avatar>
            ) : (
              <PersonIcon />
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

      <Options
        open={optionsOpen}
        anchorEl={optionsAnchor}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={toggleOptionsOpen}
      />
      <Login
        open={loginOpen}
        anchorEl={loginAnchor}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={toggleLoginOpen}
      />
    </AppBar>
  );
}
