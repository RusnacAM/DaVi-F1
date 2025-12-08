import "../App.css";
import { useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import { TrackTab } from "./layouts/TrackTab";
import { BreakingTab } from "./layouts/BreakingTab";

export const Visualization = () => {
  const { sessionYears, sessionName, sessionIdentifier, driverNames, tabValue } = useFilterConfigs();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <nav className="navbar">
        <FilterMenu onClickSelect={() => setRefreshKey(k => k + 1)} />
      </nav>

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
    </>
  );
};