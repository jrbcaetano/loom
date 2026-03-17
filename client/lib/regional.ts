export const DATE_FORMAT_OPTIONS = ["locale", "dd_mm_yyyy", "mm_dd_yyyy", "yyyy_mm_dd"] as const;
export const TIME_FORMAT_OPTIONS = ["locale", "12h", "24h"] as const;

export type DateFormatOption = (typeof DATE_FORMAT_OPTIONS)[number];
export type TimeFormatOption = (typeof TIME_FORMAT_OPTIONS)[number];

export type RegionalSettings = {
  dateFormat: DateFormatOption;
  timeFormat: TimeFormatOption;
};

export const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  dateFormat: "locale",
  timeFormat: "locale"
};

export function isDateFormatOption(value: string | null | undefined): value is DateFormatOption {
  return !!value && DATE_FORMAT_OPTIONS.includes(value as DateFormatOption);
}

export function isTimeFormatOption(value: string | null | undefined): value is TimeFormatOption {
  return !!value && TIME_FORMAT_OPTIONS.includes(value as TimeFormatOption);
}
