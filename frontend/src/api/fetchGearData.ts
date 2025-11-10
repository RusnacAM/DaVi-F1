import { apiRequest } from "./api-client";
import { drivers } from "../utils/data";

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

const driverCode: Record<string, string> = Object.values(drivers)
  .flat()
  .reduce((acc, name) => {
    const spaceIndex = name.indexOf(" ");
    if (spaceIndex !== -1 && spaceIndex + 1 < name.length) {
      const code = name.slice(spaceIndex + 1, spaceIndex + 4).toUpperCase();
      acc[name] = code;
    } else {
      acc[name] = name.slice(0, 3).toUpperCase();
    }
    return acc;
  }, {} as Record<string, string>);

export const fetchGearData = async (sessionYear: string, sessionName: string, identifier: string, driverName: string): Promise<GearDataResponse> => {

  return await apiRequest<GearDataResponse>(`/gear-data?session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifierMap[identifier]}&driver=${driverCode[driverName]}`, 'GET')
};