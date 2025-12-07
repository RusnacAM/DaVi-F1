import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData"

export interface TrackDominancePoint {
  x: number;
  y: number;
  minisector: number;
  fastest_driver: string;
  driver: string;
  year: number;
}

export type TrackDominanceResponse = TrackDominancePoint[]

export const fetchTrackDominance = async (sessionName: string, identifier: string, drivers: string[], sessionYears: string[] ): Promise<TrackDominanceResponse> => {
  const driverCodes = drivers.map(d => driverCode[d]);
  let driversParam = "";
  driverCodes.forEach(driverCode => driversParam += `&drivers=${driverCode}`);

  let yearsParam = "";
  sessionYears.forEach(year => yearsParam += `&session_years=${year}`)

  return await apiRequest<TrackDominanceResponse>(`/track-dominance?session_name=${sessionName}&identifier=${identifier}${driversParam}${yearsParam}`, 'GET')
};