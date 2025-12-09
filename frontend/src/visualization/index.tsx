import "../App.css";
import * as d3 from "d3";
import { useMemo, useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import { TrackTab } from "./layouts/TrackTab";
import { BreakingTab } from "./layouts/BreakingTab";
import { Box, Drawer, IconButton, Tab, Tabs } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { driverCode, getDriverYearColor } from "../utils/configureFilterData";

export const Visualization = () => {
  const { sessionYears, sessionName, sessionIdentifier, driverNames } =
    useFilterConfigs();
  const [tabValue, setTabValue] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);

  const baseColors = d3.schemeTableau10;
  const driverCodes = driverNames.map((d) => driverCode[d]);
  const driverColorMap: Record<string, string> = {};
  driverCodes.forEach((code, i) => {
    driverColorMap[code] = baseColors[i % baseColors.length];
  });

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const legendItems = useMemo(() => {
    return driverNames.flatMap((driverName) => {
      const code = driverCode[driverName];

      return sessionYears.map((year) => {
        const key = `${code}_${year}`;
        const color = getDriverYearColor(key, driverColorMap, sessionYears);
        const shortYear = year[2] + year[3];

        return (
          <div className="legend-color-block" key={key}>
            <div
              style={{
                width: "14px",
                height: "14px",
                backgroundColor: color,
                borderRadius: "3px",
                marginRight: "6px",
              }}
            />
            <span>{code + " " + shortYear}</span>
          </div>
        );
      });
    });
  }, [refreshKey]);

  return (
    <div className="root-container">
      <div className="top-bar">
        <IconButton
          color="inherit"
          onClick={toggleDrawer(true)}
          sx={{
            p: 0,
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

        <div className="legend-container">{legendItems}</div>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit">
            <Tab label="Track Dominance" value={0} sx={{ color: "white" }} />
            <Tab label="Braking" value={1} sx={{ color: "white" }} />
          </Tabs>
        </Box>
      </div>

      <div className="viz-wrapper">
        {tabValue === 0 && (
          <TrackTab
            sessionYears={sessionYears}
            sessionName={sessionName}
            sessionIdentifier={sessionIdentifier}
            driverNames={driverNames}
            refreshKey={refreshKey}
            driverColorMap={driverColorMap}
          />
        )}

        {tabValue === 1 && (
          <BreakingTab
            sessionYears={sessionYears}
            sessionName={sessionName}
            sessionIdentifier={sessionIdentifier}
            driverNames={driverNames}
            refreshKey={refreshKey}
            driverColorMap={driverColorMap}
          />
        )}
      </div>

      {open && (
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
      )}
    </div>
  );
};
