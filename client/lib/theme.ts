export const THEME_OPTIONS = ["loom", "loom-dark", "hearth"] as const;
export const DENSITY_OPTIONS = ["comfortable", "compact"] as const;

export type AppTheme = (typeof THEME_OPTIONS)[number];
export type ThemeColorMode = "light" | "dark";
export type AppDensity = (typeof DENSITY_OPTIONS)[number];

export const DEFAULT_THEME: AppTheme = "loom";
export const DEFAULT_DENSITY: AppDensity = "comfortable";

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return !!value && THEME_OPTIONS.includes(value as AppTheme);
}

export function getThemeColorMode(theme: AppTheme): ThemeColorMode {
  return theme === "loom-dark" ? "dark" : "light";
}

export function isAppDensity(value: string | null | undefined): value is AppDensity {
  return !!value && DENSITY_OPTIONS.includes(value as AppDensity);
}

export function getThemeLabelKey(theme: AppTheme) {
  switch (theme) {
    case "loom":
      return "settings.themeLoom";
    case "loom-dark":
      return "settings.themeLoomDark";
    case "hearth":
      return "settings.themeHearth";
    default:
      return "settings.themeLoom";
  }
}

export function getThemeDescriptionKey(theme: AppTheme) {
  switch (theme) {
    case "loom":
      return "settings.themeLoomDescription";
    case "loom-dark":
      return "settings.themeLoomDarkDescription";
    case "hearth":
      return "settings.themeHearthDescription";
    default:
      return "settings.themeLoomDescription";
  }
}

export function getDensityLabelKey(density: AppDensity) {
  switch (density) {
    case "comfortable":
      return "settings.densityComfortable";
    case "compact":
      return "settings.densityCompact";
    default:
      return "settings.densityComfortable";
  }
}

export function getDensityDescriptionKey(density: AppDensity) {
  switch (density) {
    case "comfortable":
      return "settings.densityComfortableDescription";
    case "compact":
      return "settings.densityCompactDescription";
    default:
      return "settings.densityComfortableDescription";
  }
}
