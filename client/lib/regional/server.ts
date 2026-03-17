import { cookies } from "next/headers";
import { DEFAULT_REGIONAL_SETTINGS, isDateFormatOption, isTimeFormatOption, type RegionalSettings } from "@/lib/regional";

export async function getRequestRegionalSettings(): Promise<RegionalSettings> {
  const cookieStore = await cookies();
  const rawDateFormat = cookieStore.get("loom-date-format")?.value;
  const rawTimeFormat = cookieStore.get("loom-time-format")?.value;

  return {
    dateFormat: isDateFormatOption(rawDateFormat) ? rawDateFormat : DEFAULT_REGIONAL_SETTINGS.dateFormat,
    timeFormat: isTimeFormatOption(rawTimeFormat) ? rawTimeFormat : DEFAULT_REGIONAL_SETTINGS.timeFormat
  };
}
