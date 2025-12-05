import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData"


export interface TrackDominancePoint {
  x: number;
  y: number;
  minisector: number;
  fastest_driver: string;
  year: number; 
}

export type TrackDominanceResponse = TrackDominancePoint[]

export const fetchTrackDominance = async (
  sessionYears: string[], 
  sessionName: string, 
  identifier: string, 
  drivers: string[]
): Promise<TrackDominanceResponse> => {

  //console.log("Value:", sessionYears);
  //console.log("Is array:", Array.isArray(sessionYears))

  //Driver names
  const driverCodes = drivers.map(d => driverCode[d]);
  var driversParam = ""
  driverCodes.forEach(driverCode => driversParam += `&drivers=${driverCode}`)

  //Session years
  var yearsParam = ""
  sessionYears.forEach(year => yearsParam += `&session_years=${year}`)

  
  const url = `/track-dominance?session_name=${sessionName}&identifier=${identifier}${yearsParam}${driversParam}`;
  console.log("Fetching URL: ", url);

  return await apiRequest<TrackDominanceResponse>(url, 'GET');
};

