import { apiRequest } from "./api-client";
import { driverCode } from "../utils/configureFilterData";

export interface BrakingDistributionPoint {
  braking_distance: number;
  driver: string;
  lap: number;
}

export const fetchBrakingDistribution = async (
  sessionYear: string,
  sessionName: string,
  identifier: string,
  drivers: string[]
): Promise<BrakingDistributionPoint[]> => {
  const driverCodes = drivers.map((d) => driverCode[d]);

  let driversParam = "";
  driverCodes.forEach((code) => {
    driversParam += `&drivers=${code}`;
  });

  const resp = await apiRequest<{ data: BrakingDistributionPoint[] }>(
    `/braking-distribution?session_year=${sessionYear}&session_name=${sessionName}&identifier=${identifier}${driversParam}`,
    "GET"
  );
  return resp.data;
};
