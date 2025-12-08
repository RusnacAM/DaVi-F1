
import { createContext, useContext, useState, type ReactNode } from "react";

type FilterConfigsContextValue = {
    sessionYears: string[],
    setSessionYears: (newSessionYears: string[]) => void,
    sessionName: string,
    setSessionName: (newSessionName: string) => void,
    sessionIdentifier: string,
    setSessionIdentifier: (newSessionIdentifiers: string) => void,
    driverNames: string[],
    setDriverNames: (newDriverNames: string[]) => void,
    tabValue: number,
    setTabValue: (newTabValue: number) => void
}

const FilterConfigsContext = createContext<FilterConfigsContextValue>({} as FilterConfigsContextValue)

export const FilterConfigsProvider: React.FC<{
  children?: ReactNode
}> = ({
  children,
}) => {

    const [sessionYears, setSessionYears] = useState<string[]>(["2025"]);
    const [sessionName, setSessionName] = useState<string>("Australian Grand Prix");
    const [sessionIdentifier, setSessionIdentifier] = useState<string>("Race")
    const [driverNames, setDriverNames] = useState<string[]>(["Max Verstappen", "Lando Norris"]);
    const [tabValue, setTabValue] = useState<number>(0);

    return (
      <FilterConfigsContext.Provider value={{
        sessionYears,
        setSessionYears,
        sessionName,
        setSessionName,
        sessionIdentifier,
        setSessionIdentifier,
        driverNames,
        setDriverNames,
        tabValue,
        setTabValue
      }}>
        {children}
      </FilterConfigsContext.Provider>
    )
  }

const useFilterConfigs = (): FilterConfigsContextValue => {
  return useContext(FilterConfigsContext)
}

export default useFilterConfigs;
