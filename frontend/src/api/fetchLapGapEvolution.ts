import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData"

export interface LapGapEvolutionPoint {
  x: number;
  y: number;
  driver: string;
  year: number;
}

export type LapGapEvolutionResponse = LapGapEvolutionPoint[]

export const fetchLapGapEvolution = async (sessionName: string, identifier: string, drivers: string[], sessionYears: string[] ): Promise<LapGapEvolutionResponse> => {
  const driverCodes = drivers.map(d => driverCode[d]);
  let driversParam = "";
  driverCodes.forEach(driverCode => driversParam += `&drivers=${driverCode}`);

  let yearsParam = "";
  sessionYears.forEach(year => yearsParam += `&session_years=${year}`)

  return await apiRequest<LapGapEvolutionResponse>(`/lap-gap-evolution?session_name=${sessionName}&identifier=${identifier}${driversParam}${yearsParam}`, 'GET')
};