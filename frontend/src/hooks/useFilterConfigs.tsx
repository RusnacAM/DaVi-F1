
import { createContext, useContext, useState, type ReactNode } from "react";

type FilterConfigsContextValue = {
    sessionYears: string[],
    setSessionYears: (newSessionYears: string[]) => void,
    sessionName: string,
    setSessionName: (newSessionName: string) => void,
    sessionIdentifier: string,
    setSessionIdentifier: (newSessionIdentifier: string) => void,
    driverNames: string[],
    setDriverNames: (newDriverNames: string[]) => void,
}

const FilterConfigsContext = createContext<FilterConfigsContextValue>({} as FilterConfigsContextValue)

export const FilterConfigsProvider: React.FC<{
  children?: ReactNode
}> = ({
  children,
}) => {

    const [sessionYears, setSessionYears] = useState<string[]>(["2021","2022"]);
    const [sessionName, setSessionName] = useState<string>("Spanish Grand Prix");
    const [sessionIdentifier, setSessionIdentifier] = useState<string>("Qualifying");
    const [driverNames, setDriverNames] = useState<string[]>(["Max Verstappen","Charles Leclerc"]);

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
      }}>
        {children}
      </FilterConfigsContext.Provider>
    )
  }

const useFilterConfigs = (): FilterConfigsContextValue => {
  return useContext(FilterConfigsContext)
}

export default useFilterConfigs;
