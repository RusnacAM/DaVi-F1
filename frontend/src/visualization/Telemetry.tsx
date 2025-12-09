import type { TelemetryResponse }from "../api/fetchTelemetry";
import { TelemetryLineChart } from "../components/TelemetryLineChart";

export const Telemetry: React.FC<{ data: TelemetryResponse }> = ({ data }) => {
  return (
    <div>
      <TelemetryLineChart data={data} metric="speed" label="Speed" />
      <TelemetryLineChart data={data} metric="RPM" label="RPM" />
      <TelemetryLineChart data={data} metric="Throttle" label="Throttle" />
      <TelemetryLineChart data={data} metric="Brake" label="Brake" />
      <TelemetryLineChart data={data} metric="nGear" label="Gear" />
      <TelemetryLineChart data={data} metric="DRS" label="DRS" />
    </div>
  );
};
