import { z } from "zod";

export const HOME_WIDGET_KEYS = [
  "upcoming_events",
  "quick_stats",
  "shopping_list",
  "tasks",
  "weekly_meals",
  "chores_rewards",
  "weather"
] as const;

export type HomeWidgetKey = (typeof HOME_WIDGET_KEYS)[number];

export const WEATHER_UNITS = ["celsius", "fahrenheit"] as const;
export type WeatherUnit = (typeof WEATHER_UNITS)[number];

const weatherWidgetSettingsSchema = z.object({
  location: z.string().trim().max(120).default(""),
  unit: z.enum(WEATHER_UNITS).default("celsius")
});

const widgetSettingsSchema = z.object({
  weather: weatherWidgetSettingsSchema.optional()
});

const dashboardWidgetSchema = z.object({
  key: z.enum(HOME_WIDGET_KEYS),
  enabled: z.boolean().default(true)
});

const homeDashboardSchema = z.object({
  widgets: z.array(dashboardWidgetSchema).default([]),
  settings: widgetSettingsSchema.default({})
});

export type WeatherWidgetSettings = z.infer<typeof weatherWidgetSettingsSchema>;
export type DashboardWidgetPreference = z.infer<typeof dashboardWidgetSchema>;
export type HomeDashboardPreferences = z.infer<typeof homeDashboardSchema>;

export type HomeWidgetDefinition = {
  key: HomeWidgetKey;
  labelKey: string;
  fallbackLabel: string;
  descriptionKey: string;
  fallbackDescription: string;
};

export const HOME_WIDGET_CATALOG: HomeWidgetDefinition[] = [
  {
    key: "upcoming_events",
    labelKey: "home.widgets.upcomingEvents",
    fallbackLabel: "Upcoming events",
    descriptionKey: "home.widgets.upcomingEventsDescription",
    fallbackDescription: "See the next events waiting for your attention."
  },
  {
    key: "quick_stats",
    labelKey: "home.widgets.quickStats",
    fallbackLabel: "Quick stats",
    descriptionKey: "home.widgets.quickStatsDescription",
    fallbackDescription: "A quick pulse check for tasks, chores, and shopping."
  },
  {
    key: "shopping_list",
    labelKey: "home.widgets.shoppingList",
    fallbackLabel: "Shopping list",
    descriptionKey: "home.widgets.shoppingListDescription",
    fallbackDescription: "Keep the latest shared shopping items within reach."
  },
  {
    key: "tasks",
    labelKey: "home.widgets.tasks",
    fallbackLabel: "Tasks",
    descriptionKey: "home.widgets.tasksDescription",
    fallbackDescription: "Keep your current tasks front and center."
  },
  {
    key: "weekly_meals",
    labelKey: "home.widgets.weeklyMeals",
    fallbackLabel: "Weekly meals",
    descriptionKey: "home.widgets.weeklyMealsDescription",
    fallbackDescription: "Check what the week has planned for the table."
  },
  {
    key: "chores_rewards",
    labelKey: "home.widgets.choresRewards",
    fallbackLabel: "Chores and rewards",
    descriptionKey: "home.widgets.choresRewardsDescription",
    fallbackDescription: "Track family momentum and reward balances."
  },
  {
    key: "weather",
    labelKey: "home.widgets.weather",
    fallbackLabel: "Weather",
    descriptionKey: "home.widgets.weatherDescription",
    fallbackDescription: "Bring today's forecast into your dashboard."
  }
];

const defaultDashboardPreferences: HomeDashboardPreferences = {
  widgets: HOME_WIDGET_CATALOG.map((widget) => ({
    key: widget.key,
    enabled: widget.key !== "weather"
  })),
  settings: {
    weather: {
      location: "",
      unit: "celsius"
    }
  }
};

export function getDefaultHomeDashboardPreferences(): HomeDashboardPreferences {
  const defaultWeather = defaultDashboardPreferences.settings.weather ?? {
    location: "",
    unit: "celsius" as const
  };

  return {
    widgets: defaultDashboardPreferences.widgets.map((widget) => ({ ...widget })),
    settings: {
      weather: {
        location: defaultWeather.location,
        unit: defaultWeather.unit
      }
    }
  };
}

export function normalizeHomeDashboardPreferences(input: unknown): HomeDashboardPreferences {
  const parsed = homeDashboardSchema.safeParse(input);
  const defaults = getDefaultHomeDashboardPreferences();

  if (!parsed.success) {
    return defaults;
  }

  const widgetMap = new Map<HomeWidgetKey, DashboardWidgetPreference>();
  for (const widget of parsed.data.widgets) {
    if (!widgetMap.has(widget.key)) {
      widgetMap.set(widget.key, widget);
    }
  }

  const widgets: DashboardWidgetPreference[] = [];

  for (const widget of parsed.data.widgets) {
    const normalizedWidget = widgetMap.get(widget.key);
    if (!normalizedWidget || widgets.some((entry) => entry.key === normalizedWidget.key)) {
      continue;
    }

    widgets.push({
      key: normalizedWidget.key,
      enabled: normalizedWidget.enabled
    });
  }

  for (const fallbackWidget of defaults.widgets) {
    if (widgets.some((widget) => widget.key === fallbackWidget.key)) {
      continue;
    }

    widgets.push({
      key: fallbackWidget.key,
      enabled: fallbackWidget.enabled
    });
  }

  const parsedWeather: Partial<WeatherWidgetSettings> = parsed.data.settings.weather ?? {};
  const defaultWeather = defaults.settings.weather ?? {
    location: "",
    unit: "celsius" as const
  };

  return {
    widgets,
    settings: {
      weather: {
        location: parsedWeather.location ?? defaultWeather.location,
        unit: parsedWeather.unit ?? defaultWeather.unit
      }
    }
  };
}
