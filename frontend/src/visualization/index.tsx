import "../App.css";
import { useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import { TrackTab } from "./layouts/TrackTab";
import { BreakingTab } from "./layouts/BreakingTab";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";

export const Visualization = () => {
  const {
    sessionYears,
    sessionName,
    sessionIdentifier,
    driverNames,
    tabValue,
  } = useFilterConfigs();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  return (
    <div className="root-container">
      <IconButton
        color="inherit"
        onClick={toggleDrawer(true)}
        sx={{
          p: 0,
          position: "absolute",
          "&:focus": {
            outline: "none",
          },
          "&:focus-visible": {
            outline: "none",
          },
        }}
      >
        <TuneIcon />
      </IconButton>

      <Drawer
        open={open}
        onClose={toggleDrawer(false)}
        slotProps={{
          paper: {
            className: "sidebar",
          },
        }}
      >
        <FilterMenu
          onClickSelect={() => {
            setRefreshKey((k) => k + 1);
            setOpen(false);
          }}
        />
      </Drawer>

      {tabValue === 0 && (
        <TrackTab
          sessionYears={sessionYears}
          sessionName={sessionName}
          sessionIdentifier={sessionIdentifier}
          driverNames={driverNames}
          refreshKey={refreshKey}
        />
      )}

      {tabValue === 1 && (
        <BreakingTab
          sessionYears={sessionYears}
          sessionName={sessionName}
          sessionIdentifier={sessionIdentifier}
          driverNames={driverNames}
          refreshKey={refreshKey}
        />
      )}
    </div>
  );
};
