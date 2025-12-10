import * as d3 from "d3";
import { DRIVERS } from "./data";

export const identifierMap: Record<string, string> = {
  FP1: "FP1",
  FP2: "FP2",
  FP3: "FP3",
  Race: "R",
  Qualifying: "Q",
};

export const driverCode: Record<string, string> = Object.values(DRIVERS)
  .flat()
  .reduce((acc, name) => {
    const specialCharMap: Record<string, string> = {
      É: "E",
      Ü: "U",
      Ä: "A",
    };

    const replaceSpecialChars = (str: string): string =>
      str.replace(/[^\w]/g, (c) => specialCharMap[c] || c);

    const spaceIndex = name.indexOf(" ");
    if (spaceIndex !== -1 && spaceIndex + 1 < name.length) {
      let code = name.slice(spaceIndex + 1, spaceIndex + 4).toUpperCase();
      code = replaceSpecialChars(code);
      acc[name] = code;
    } else {
      let code = name.slice(0, 3).toUpperCase();
      code = replaceSpecialChars(code);
      acc[name] = code;
    }
    return acc;
  }, {} as Record<string, string>);

export function getDriverYearColor(
  driverYear: string,
  driverColorMap: Record<string, string>,
  sessionYears: string[]
): string {
  const [code, year] = driverYear.split("_");
  const baseColor = d3.color(driverColorMap[code])!;
  const yearIndex = sessionYears.indexOf(year);

  if (!baseColor) {
    console.warn(`Invalid color for driver code: ${code}`);
    return "rgb(128,128,128)";
  }

  if (yearIndex === 1) {
    return d3.color(baseColor.brighter(1.1))!.formatRgb();
  }

  return baseColor.formatRgb();
}
