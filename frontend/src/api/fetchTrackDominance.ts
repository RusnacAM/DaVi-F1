import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData"

export interface TrackDominancePoint {
  x: number;
  y: number;
  minisector: number;
  fastest_driver: string;
}

export type TrackDominanceResponse = {
  [driverCode: string]: TrackDominancePoint[];
}

// export const fetchTrackDominance = async (sessionYear:string, sessionName: string, identifier: string, driver01: string, driver02: string, driver03: string): Promise<TrackDominanceResponse> => {
//     return await apiRequest<TrackDominanceResponse>(`/track-dominance?&session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifier}&driver01=${driverCode[driver01]}&driver02=${driverCode[driver02]}&driver03=${driverCode[driver03]}`, 'GET')
// };

export const fetchTrackDominance = async (sessionYear:string, sessionName: string, identifier: string, drivers: string[]): Promise<TrackDominanceResponse> => {
  const driverCodes = drivers.map(d => driverCode[d]);
  
  // const driverParams = drivers
  //   .map((i, j) => `driver${String(j + 1).padStart(2, '0')}=${driverCode[i]}`)
  //   .join('&');
  
  var driversParam = ""
  driverCodes.forEach(driverCode => driversParam += `&drivers=${driverCode}`)

  console.log(driversParam)

  return await apiRequest<TrackDominanceResponse>(`/track-dominance?&session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifier}&${driversParam}`, 'GET')
};