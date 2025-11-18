import { apiRequest } from "./api-client";

export interface TrackDominancePoint {
  x: number;
  y: number;
  minisector: number;
  fastest_driver: string;
  time_diff: number;
}

export type TrackDominanceResponse = TrackDominancePoint[];

export const fetchTrackDominance = async (sessionYear:string, sessionName: string, identifier: string, driver01: string, driver02: string): Promise<TrackDominanceResponse> => {
    return await apiRequest<TrackDominanceResponse>(`/track-dominance?&session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifier}&driver01=${driver01}&driver02=${driver02}`, 'GET')
};