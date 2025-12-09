import { Button } from "@mui/material";
import { FilterSelect } from "./FilterSelect";
import { MultiSelect } from "./MultiSelect";
import useFilterConfigs from "../../hooks/useFilterConfigs";
import {
  DRIVERS,
  SESSION_IDENTIFIERS,
  SESSIONS,
  YEARS,
} from "../../utils/data";
import { useMemo } from "react";

export interface FilterMenuProps {
  onClickSelect: () => void;
}

const FilterMenu: React.FC<FilterMenuProps> = ({ onClickSelect }) => {
  const {
    driverNames,
    setDriverNames,
    sessionYears,
    setSessionYears,
    sessionName,
    setSessionName,
    sessionIdentifier,
    setSessionIdentifier,
  } = useFilterConfigs();

  // the session names intersection over all the selected years
  const commonSessionNames: string[] = useMemo(() => {
    return sessionYears
      .map((year) => SESSIONS[year])
      .reduce((acc, currSessions) => {
        if (acc.length === 0) {
          // the first step, put all the sessions
          return currSessions;
        }
        return acc.filter((sess) => currSessions.includes(sess));
      }, []);
  }, [sessionYears]);

  // the driver names intersection over all the selected years
  const commonDriverNames: string[] = useMemo(() => {
    return sessionYears
      .map((year) => DRIVERS[year])
      .reduce((acc, currSessions) => {
        if (acc.length === 0) {
          // the first step, put all the sessions
          return currSessions;
        }
        return acc.filter((sess) => currSessions.includes(sess));
      }, []);
  }, [sessionYears]);

  const selectButtonDisabled = useMemo(() => {
    return (
      sessionYears.length === 0 ||
      sessionName === "" ||
      sessionIdentifier === "" ||
      driverNames.length === 0
    );
  }, [sessionYears, sessionName, sessionIdentifier, driverNames]);

  return (
    <div className="filter-menu">
      <div className="filters">
        <MultiSelect
          value={sessionYears}
          setValue={setSessionYears}
          menuItems={YEARS}
          label={"Session Years"}
          selectLimit={2}
        />

        <FilterSelect
          value={sessionName}
          setValue={setSessionName}
          menuItems={commonSessionNames}
          label={"GP Name"}
        />

        <FilterSelect
          value={sessionIdentifier}
          setValue={setSessionIdentifier}
          menuItems={SESSION_IDENTIFIERS}
          label={"Identifier"}
        />

        <MultiSelect
          value={driverNames}
          setValue={setDriverNames}
          menuItems={commonDriverNames}
          label={"Drivers"}
          selectLimit={10}
        />
      </div>
      <Button
        variant="contained"
        onClick={onClickSelect}
        disabled={selectButtonDisabled}
        sx={{
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "14px",
        }}
      >
        Filter
      </Button>
    </div>
  );
};

export default FilterMenu;
