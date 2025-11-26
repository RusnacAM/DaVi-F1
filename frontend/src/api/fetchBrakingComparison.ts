import { apiRequest } from "./api-client";
import { driverCode, identifierMap } from "../utils/configureFilterData";

export interface BrakingPoint {
  distance: number;
  ideal_brake: number;
  driver_brake: number;
}

export type BrakingComparisonResponse = BrakingPoint[];

export const fetchBrakingComparison = async (
  sessionYear: string,
  sessionName: string,
  identifier: string,
  driverName: string
): Promise<BrakingComparisonResponse> => {

  const code = driverCode[driverName];

  if (!code) {
    console.error("Driver name not found in driverCode map:", driverName);
    return [];
  }

  return await apiRequest<BrakingComparisonResponse>(
    `/braking-comparison?session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifierMap[identifier]}&driver=${code}`,
    "GET"
  );
};
