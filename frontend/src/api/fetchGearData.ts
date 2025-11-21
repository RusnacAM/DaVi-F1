import { apiRequest } from "./api-client";
import { identifierMap, driverCode } from "../utils/configureFilterData"

export interface GearDataResponse {
  x: number[],
  y: number[],
  gear: number[]
}

export const fetchGearData = async (sessionYear: string, sessionName: string, identifier: string, driverName: string): Promise<GearDataResponse> => {
  return await apiRequest<GearDataResponse>(`/gear-data?session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifierMap[identifier]}&driver=${driverCode[driverName]}`, 'GET')
};