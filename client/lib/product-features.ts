export const PRODUCT_FEATURE_CATALOG = [
  { key: "tasks", labelKey: "nav.tasks", fallbackLabel: "Tasks", routePrefixes: ["/tasks"] },
  { key: "lists", labelKey: "nav.lists", fallbackLabel: "Lists", routePrefixes: ["/lists"] },
  { key: "calendar", labelKey: "nav.calendar", fallbackLabel: "Calendar", routePrefixes: ["/calendar"] },
  { key: "schedules", labelKey: "nav.schedules", fallbackLabel: "Schedules", routePrefixes: ["/schedules"] },
  { key: "notifications", labelKey: "nav.notifications", fallbackLabel: "Notifications", routePrefixes: ["/notifications"] },
  { key: "meals", labelKey: "nav.meals", fallbackLabel: "Meal Planner", routePrefixes: ["/meals"] },
  { key: "chores", labelKey: "nav.chores", fallbackLabel: "Chores", routePrefixes: ["/chores"] },
  { key: "rewards", labelKey: "nav.rewards", fallbackLabel: "Rewards", routePrefixes: ["/rewards"] },
  { key: "notes", labelKey: "nav.notes", fallbackLabel: "Notes", routePrefixes: ["/notes"] },
  { key: "messages", labelKey: "nav.messages", fallbackLabel: "Messages", routePrefixes: ["/messages"] },
  { key: "expenses", labelKey: "nav.expenses", fallbackLabel: "Expenses", routePrefixes: ["/expenses"] },
  { key: "documents", labelKey: "nav.documents", fallbackLabel: "Documents", routePrefixes: ["/documents"] },
  { key: "routines", labelKey: "nav.routines", fallbackLabel: "Routines", routePrefixes: ["/routines"] },
  { key: "family_members", labelKey: "nav.family", fallbackLabel: "Family Members", routePrefixes: ["/family/members"] },
  { key: "family_settings", labelKey: "family.settingsTitle", fallbackLabel: "Family Settings", routePrefixes: ["/family/settings"] },
  { key: "settings", labelKey: "nav.settings", fallbackLabel: "Settings", routePrefixes: ["/settings"] }
] as const;

export type ProductFeatureKey = (typeof PRODUCT_FEATURE_CATALOG)[number]["key"];

export type ProductFeatureAvailability = Record<ProductFeatureKey, boolean>;

const PRODUCT_FEATURE_KEY_SET = new Set<string>(PRODUCT_FEATURE_CATALOG.map((feature) => feature.key));

const FEATURE_ROUTE_PREFIXES = PRODUCT_FEATURE_CATALOG
  .flatMap((feature) => feature.routePrefixes.map((prefix) => ({ featureKey: feature.key, prefix })))
  .sort((left, right) => right.prefix.length - left.prefix.length);

export function isKnownProductFeatureKey(value: string): value is ProductFeatureKey {
  return PRODUCT_FEATURE_KEY_SET.has(value);
}

export function getDefaultProductFeatureAvailability(): ProductFeatureAvailability {
  return PRODUCT_FEATURE_CATALOG.reduce<ProductFeatureAvailability>(
    (accumulator, feature) => {
      accumulator[feature.key] = true;
      return accumulator;
    },
    {} as ProductFeatureAvailability
  );
}

export function normalizeProductFeatureAvailability(
  partial?: Partial<ProductFeatureAvailability> | null
): ProductFeatureAvailability {
  const normalized = getDefaultProductFeatureAvailability();

  if (!partial) {
    return normalized;
  }

  for (const [key, value] of Object.entries(partial)) {
    if (!isKnownProductFeatureKey(key)) {
      continue;
    }

    normalized[key] = Boolean(value);
  }

  return normalized;
}

export function isProductFeatureEnabled(
  featureKey: ProductFeatureKey,
  availability?: Partial<ProductFeatureAvailability> | null
) {
  const normalized = normalizeProductFeatureAvailability(availability);
  return normalized[featureKey];
}

export function resolveProductFeatureKeyFromPathname(pathname: string): ProductFeatureKey | null {
  for (const entry of FEATURE_ROUTE_PREFIXES) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      return entry.featureKey;
    }
  }

  return null;
}
