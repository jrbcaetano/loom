import type { AppLocale } from "@/lib/i18n/config";
import type { WeatherUnit } from "@/features/home/dashboard";

type GeocodingResponse = {
  results?: Array<{
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
};

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
};

type IpLocationResponse = {
  city?: string;
  region?: string;
  country_name?: string;
};

type HeaderLocationInput = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export type WeatherWidgetData =
  | {
      status: "ready";
      locationLabel: string;
      temperature: number;
      apparentTemperature: number | null;
      windSpeed: number | null;
      summary: string;
      unitLabel: string;
    }
  | {
      status: "error";
      message: string;
      locationLabel: string;
    };

function getWeatherCodeLabel(code: number | undefined, isDay: boolean, locale: AppLocale) {
  const labels =
    locale === "pt"
      ? {
          clear: isDay ? "Ceu limpo" : "Ceu limpo esta noite",
          mostlyClear: isDay ? "Poucas nuvens" : "Noite com poucas nuvens",
          partlyCloudy: "Parcialmente nublado",
          cloudy: "Nublado",
          fog: "Nevoeiro",
          drizzle: "Chuviscos",
          rain: "Chuva",
          snow: "Neve",
          storm: "Trovoada"
        }
      : {
          clear: isDay ? "Clear skies" : "Clear tonight",
          mostlyClear: isDay ? "Mostly clear" : "Mostly clear tonight",
          partlyCloudy: "Partly cloudy",
          cloudy: "Cloudy",
          fog: "Foggy",
          drizzle: "Drizzly",
          rain: "Rain on the radar",
          snow: "Snowy",
          storm: "Stormy"
        };

  if (code === 0) return labels.clear;
  if (code === 1) return labels.mostlyClear;
  if (code === 2) return labels.partlyCloudy;
  if (code === 3) return labels.cloudy;
  if (code === 45 || code === 48) return labels.fog;
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return labels.drizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return labels.rain;
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return labels.snow;
  if ([95, 96, 99].includes(code ?? -1)) return labels.storm;
  return locale === "pt" ? "Tempo a atualizar" : "Forecast settling in";
}

function buildLocationLabel(place: { name: string; admin1?: string; country?: string }) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function isPublicIpAddress(ipAddress: string) {
  const normalized = ipAddress.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "localhost" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("172.16.") ||
    normalized.startsWith("172.17.") ||
    normalized.startsWith("172.18.") ||
    normalized.startsWith("172.19.") ||
    normalized.startsWith("172.20.") ||
    normalized.startsWith("172.21.") ||
    normalized.startsWith("172.22.") ||
    normalized.startsWith("172.23.") ||
    normalized.startsWith("172.24.") ||
    normalized.startsWith("172.25.") ||
    normalized.startsWith("172.26.") ||
    normalized.startsWith("172.27.") ||
    normalized.startsWith("172.28.") ||
    normalized.startsWith("172.29.") ||
    normalized.startsWith("172.30.") ||
    normalized.startsWith("172.31.") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return false;
  }

  return true;
}

export function getLocationLabelFromHeaders(input: HeaderLocationInput): string | null {
  const city = input.city?.trim() ?? "";
  const region = input.region?.trim() ?? "";
  const country = input.country?.trim() ?? "";
  const label = [city, region, country].filter(Boolean).join(", ");
  return label || null;
}

export async function getLocationLabelFromIp(ipAddress: string | null): Promise<string | null> {
  if (!ipAddress || !isPublicIpAddress(ipAddress)) {
    return null;
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ipAddress)}/json/`, {
      next: { revalidate: 60 * 60 }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as IpLocationResponse;
    const label = [payload.city, payload.region, payload.country_name].filter(Boolean).join(", ");
    return label || null;
  } catch {
    return null;
  }
}

export async function getWeatherWidgetData({
  locale,
  location,
  unit
}: {
  locale: AppLocale;
  location: string;
  unit: WeatherUnit;
}): Promise<WeatherWidgetData> {
  const trimmedLocation = location.trim();
  if (!trimmedLocation) {
    return {
      status: "error",
      message: locale === "pt" ? "Nao consegui perceber a tua localizacao atual." : "I couldn't work out your current location yet.",
      locationLabel: locale === "pt" ? "Localizacao atual" : "Current area"
    };
  }

  try {
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.searchParams.set("name", trimmedLocation);
    geocodeUrl.searchParams.set("count", "1");
    geocodeUrl.searchParams.set("language", locale);
    geocodeUrl.searchParams.set("format", "json");

    const geocodeResponse = await fetch(geocodeUrl, {
      next: { revalidate: 60 * 60 * 12 }
    });

    if (!geocodeResponse.ok) {
      throw new Error("Failed to geocode location");
    }

    const geocodePayload = (await geocodeResponse.json()) as GeocodingResponse;
    const place = geocodePayload.results?.[0];

    if (!place) {
      return {
        status: "error",
        message:
          locale === "pt"
            ? "Nao consegui encontrar essa localizacao. Tente cidade e pais."
            : "I couldn't find that location. Try a city and country.",
        locationLabel: trimmedLocation
      };
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(place.latitude));
    forecastUrl.searchParams.set("longitude", String(place.longitude));
    forecastUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day");
    forecastUrl.searchParams.set("timezone", place.timezone ?? "auto");
    forecastUrl.searchParams.set("temperature_unit", unit === "fahrenheit" ? "fahrenheit" : "celsius");
    forecastUrl.searchParams.set("wind_speed_unit", "kmh");

    const forecastResponse = await fetch(forecastUrl, {
      next: { revalidate: 60 * 30 }
    });

    if (!forecastResponse.ok) {
      throw new Error("Failed to fetch forecast");
    }

    const forecastPayload = (await forecastResponse.json()) as ForecastResponse;
    const current = forecastPayload.current;

    if (typeof current?.temperature_2m !== "number") {
      throw new Error("Missing current weather");
    }

    return {
      status: "ready",
      locationLabel: buildLocationLabel(place),
      temperature: current.temperature_2m,
      apparentTemperature: typeof current.apparent_temperature === "number" ? current.apparent_temperature : null,
      windSpeed: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : null,
      summary: getWeatherCodeLabel(current.weather_code, current.is_day !== 0, locale),
      unitLabel: unit === "fahrenheit" ? "°F" : "°C"
    };
  } catch {
    return {
      status: "error",
      message:
        locale === "pt"
          ? "A previsao meteu uma pausa. Tente novamente daqui a pouco."
          : "The forecast took a short break. Try again in a little while.",
      locationLabel: trimmedLocation
    };
  }
}
