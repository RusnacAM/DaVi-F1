import { apiRequest } from "./api-client";

export interface TelemetryResponse {
    distance: number[],
    speed: number[]
}

export const fetchTelemetry = async (driver: string, sessionYear:string, sessionName: string): Promise<TelemetryResponse> => {
    return await apiRequest<TelemetryResponse>(`/telemetry?driver=${driver}&session_year=${sessionYear}&session_name=${sessionName}`, 'GET')
};