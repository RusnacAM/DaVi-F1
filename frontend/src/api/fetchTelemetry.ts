import { apiRequest } from "./api-client";

export interface TelemetryPoint {
  time: number;
  speed: number;
  RPM: number;
  nGear: number;
  Throttle: number;
  Brake: number;
  DRS: number;
}

export type TelemetryResponse = {
  [driverCode: string]: TelemetryPoint[];
};

export const fetchTelemetry = async (sessionYear:string, sessionName: string, identifier: string, drivers: string[]): Promise<TelemetryResponse> => {
    var driversParam = ""
    drivers.forEach(driver => driversParam += `&drivers=${driver}`)
    return await apiRequest<TelemetryResponse>(`/telemetry?session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifier}${driversParam}`, 'GET')
};