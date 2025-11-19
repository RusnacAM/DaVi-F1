
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

    const [sessionYears, setSessionYears] = useState<string[]>([]);
    const [sessionName, setSessionName] = useState<string>("");
    const [sessionIdentifiers, setSessionIdentifiers] = useState<string[]>([])
    const [driverNames, setDriverNames] = useState<string[]>([]);

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
