import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData";

export interface TelemetryPoint {
  time: number;
  distance: number;
  speed: number;
  RPM: number;
  nGear: number;
  Throttle: number;
  Brake: number;
  DRS: number;
}

export type TelemetryResponse = {
  [yearDriverKey: string]: TelemetryPoint[];  // Keys will be like "2024_VER"
};

export const fetchTelemetry = async (
  sessionYears: string[],  // Changed to accept array
  sessionName: string,
  identifier: string,
  drivers: string[]
): Promise<TelemetryResponse> => {
  const driverCodes = drivers.map(d => driverCode[d]);
  const driversParam = driverCodes.map(dc => `&drivers=${dc}`).join("");
  const yearsParam = sessionYears.join(",");
  
  return await apiRequest<TelemetryResponse>(
    `/telemetry?session_year=${yearsParam}&session_name=${sessionName}&identifier=${identifier}${driversParam}`,
    "GET"
  );
};