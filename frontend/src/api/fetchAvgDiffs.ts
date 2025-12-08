import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData"

export interface AvgDiffsPoint {
  DriverYear: string;
  MinisectorLabel: string;
  Diff_to_Fastest_sec: number;
  FastestOverallDriver: string;
  FastestOverallYear: number;
}

export type AvgDiffsResponse = AvgDiffsPoint[]

export const fetchAvgDiffs = async (sessionName: string, identifier: string, drivers: string[], sessionYears: string[] ): Promise<AvgDiffsResponse> => {
  const driverCodes = drivers.map(d => driverCode[d]);
  let driversParam = "";
  driverCodes.forEach(driverCode => driversParam += `&drivers=${driverCode}`);

  let yearsParam = "";
  sessionYears.forEach(year => yearsParam += `&session_years=${year}`)

  return await apiRequest<AvgDiffsResponse>(`/AvgDiff?session_name=${sessionName}&identifier=${identifier}${driversParam}${yearsParam}`, 'GET')
};