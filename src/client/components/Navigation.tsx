import React, { createContext } from "react";
import { Drawer, IconButton, Stack } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import MouseIcon from "@mui/icons-material/Mouse";
import SettingsIcon from "@mui/icons-material/Settings";
import { OptionsModal } from "./OptionsModal";
import { useToggle } from "../hooks/useToggle";
import { NavigationButton } from "./NavigationButton";

export interface NavigationContextValue {
  open: boolean;
}

export const NavigationContext = createContext<NavigationContextValue>({
  open: false,
});

export function Navigation(): React.ReactElement {
  const [open, toggleOpen] = useToggle();
  const [optionsOpen, toggleOptionsOpen] = useToggle();

  return (
    <NavigationContext.Provider value={{ open }}>
      <Drawer variant="permanent">
        <Stack direction="column" alignItems="start" height="100%">
          <IconButton onClick={toggleOpen} sx={{ width: "fit-content" }}>
            {open ? <CloseIcon /> : <MenuIcon />}
          </IconButton>

          <NavigationButton icon={PersonIcon} label="Profile" />
          <NavigationButton icon={MouseIcon} label="Play" />

          <NavigationButton
            icon={SettingsIcon}
            label="Options"
            sx={{ marginTop: "auto" }}
            onClick={toggleOptionsOpen}
          />
        </Stack>
      </Drawer>

      <OptionsModal open={optionsOpen} onClose={toggleOptionsOpen} />
    </NavigationContext.Provider>
  );
}
