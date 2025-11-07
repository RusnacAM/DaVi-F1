import { apiRequest } from "./api-client";

export interface GearDataResponse {
    x: number[],
    y: number[],
    gear: number[]
}

const identifierMap: Record<string, string> = {
  "FP1": "FP1",
  "FP2": "FP2",
  "FP3": "FP3",
  "Race": "R",
  "Qualifying": "Q",
};

export const fetchGearData = async (sessionYear:string, sessionName: string, identifier: string): Promise<GearDataResponse> => {

    return await apiRequest<GearDataResponse>(`/gear-data?session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifierMap[identifier]}`, 'GET')
};