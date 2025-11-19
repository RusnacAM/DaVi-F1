import { apiRequest } from "./api-client";

export interface ThrottleResponse {
    distance: number[],
    throttle: number[]
}

export const fetchThrottle = async (driver: string, sessionYear:string, sessionName: string): Promise<ThrottleResponse> => {
    return await apiRequest<ThrottleResponse>(`/telemetry?driver=${driver}&session_year=${sessionYear}&session_name=${sessionName}`, 'GET')
};