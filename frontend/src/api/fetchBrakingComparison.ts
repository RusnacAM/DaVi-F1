import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData";

export interface BrakingPoint {
  distance: number;
  ideal_brake: number;
  driver_brake: number;
  driver?: string;
  year?: number;
}

// Response is now a dictionary of driver_year -> BrakingPoint[]
export type BrakingComparisonResponse = Record<string, BrakingPoint[]>;

export const fetchBrakingComparison = async (
  sessionYears: string[],
  sessionName: string,
  identifier: string,
  driverNames: string[]
): Promise<BrakingComparisonResponse> => {

  const codes = driverNames.map(name => driverCode[name]).filter(Boolean);

  if (codes.length === 0) {
    console.error("No valid driver codes found");
    return {};
  }

  const yearsParam = sessionYears.join(",");
  const driversParam = codes.join(",");

  return await apiRequest<BrakingComparisonResponse>(
    `/braking-comparison?session_year=${yearsParam}&session_name=${sessionName}&identifier=${identifier}&drivers=${driversParam}`,
    "GET"
  );
};
