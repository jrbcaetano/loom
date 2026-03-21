import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  DEFAULT_DENSITY,
  DEFAULT_THEME,
  getThemeColorMode,
  isAppDensity,
  isAppTheme,
  type AppDensity,
  type AppTheme
} from "@/lib/theme";

const THEME_COOKIE_NAME = "loom-theme";
const DENSITY_COOKIE_NAME = "loom-density";

export type ThemeSettings = {
  theme: AppTheme;
  density: AppDensity;
};

export async function getRequestTheme(): Promise<AppTheme> {
  return (await getRequestThemeSettings()).theme;
}

export async function getRequestThemeColorMode() {
  return getThemeColorMode(await getRequestTheme());
}

export async function getRequestDensity(): Promise<AppDensity> {
  return (await getRequestThemeSettings()).density;
}

export const getThemeSettingsForCurrentUser = cache(async function getThemeSettingsForCurrentUser(): Promise<ThemeSettings> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const cookieDensity = cookieStore.get(DENSITY_COOKIE_NAME)?.value;

  if (isAppTheme(cookieTheme) && isAppDensity(cookieDensity)) {
    return { theme: cookieTheme, density: cookieDensity };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      theme: isAppTheme(cookieTheme) ? cookieTheme : DEFAULT_THEME,
      density: isAppDensity(cookieDensity) ? cookieDensity : DEFAULT_DENSITY
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("theme, density")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    theme: isAppTheme(cookieTheme) ? cookieTheme : (isAppTheme(data?.theme) ? data.theme : DEFAULT_THEME),
    density: isAppDensity(cookieDensity) ? cookieDensity : (isAppDensity(data?.density) ? data.density : DEFAULT_DENSITY)
  };
});

export async function getRequestThemeSettings(): Promise<ThemeSettings> {
  return getThemeSettingsForCurrentUser();
}

export async function setThemeCookie(theme: AppTheme) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });
}

export async function setDensityCookie(density: AppDensity) {
  const cookieStore = await cookies();
  cookieStore.set(DENSITY_COOKIE_NAME, density, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });
}
