
import { createContext, useContext, useState, type ReactNode } from "react";

type FilterConfigsContextValue = {
    sessionYears: string[],
    setSessionYears: (newSessionYears: string[]) => void,
    sessionName: string,
    setSessionName: (newSessionName: string) => void,
    sessionIdentifiers: string[],
    setSessionIdentifiers: (newSessionIdentifiers: string[]) => void,
    driverNames: string[],
    setDriverNames: (newDriverNames: string[]) => void
}

const FilterConfigsContext = createContext<FilterConfigsContextValue>({} as FilterConfigsContextValue)

export const FilterConfigsProvider: React.FC<{
  children?: ReactNode
}> = ({
  children,
}) => {

    const [sessionYears, setSessionYears] = useState<string[]>(["2025"]);
    const [sessionName, setSessionName] = useState<string>("Australian Grand Prix");
    const [sessionIdentifiers, setSessionIdentifiers] = useState<string[]>(["Race"])
    const [driverNames, setDriverNames] = useState<string[]>(["Max Verstappen", "Lando Norris"]);

    return (
      <FilterConfigsContext.Provider value={{
        sessionYears,
        setSessionYears,
        sessionName,
        setSessionName,
        sessionIdentifiers,
        setSessionIdentifiers,
        driverNames,
        setDriverNames
      }}>
        {children}
      </FilterConfigsContext.Provider>
    )
  }

const useFilterConfigs = (): FilterConfigsContextValue => {
  return useContext(FilterConfigsContext)
}

export default useFilterConfigs;
