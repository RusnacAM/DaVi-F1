import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData"

export interface TrackDominancePoint {
  x: number;
  y: number;
  minisector: number;
  fastest_driver: string;
}

export type TrackDominanceResponse = TrackDominancePoint[]

export const fetchTrackDominance = async (sessionYear:string, sessionName: string, identifier: string, drivers: string[]): Promise<TrackDominanceResponse> => {
  const driverCodes = drivers.map(d => driverCode[d]);
  var driversParam = ""
  driverCodes.forEach(driverCode => driversParam += `&drivers=${driverCode}`)

  console.log(driversParam)

  return await apiRequest<TrackDominanceResponse>(`/track-dominance?&session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifier}&${driversParam}`, 'GET')
};