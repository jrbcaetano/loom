import type { ProductFeatureKey } from "@/lib/product-features";
import type { NavIconName } from "@/components/shell/nav-icon";

export type LoomModePlacement = "primary" | "more" | "settings";

export type LoomModeDefinition = {
  key: string;
  labelKey: string;
  fallbackLabel: string;
  href: string;
  icon: NavIconName;
  placement: LoomModePlacement;
  featureKey?: ProductFeatureKey;
  mobileTabEligible?: boolean;
  desktopProminent?: boolean;
};

export const LOOM_MODE_REGISTRY: LoomModeDefinition[] = [
  { key: "home", labelKey: "nav.home", fallbackLabel: "Home", href: "/home", icon: "home", placement: "primary", mobileTabEligible: true, desktopProminent: true },
  { key: "tasks", labelKey: "nav.tasks", fallbackLabel: "Tasks", href: "/tasks", icon: "tasks", placement: "primary", featureKey: "tasks", mobileTabEligible: true, desktopProminent: true },
  { key: "lists", labelKey: "nav.lists", fallbackLabel: "Lists", href: "/lists", icon: "lists", placement: "primary", featureKey: "lists", mobileTabEligible: true, desktopProminent: true },
  { key: "calendar", labelKey: "nav.calendar", fallbackLabel: "Calendar", href: "/calendar", icon: "calendar", placement: "primary", featureKey: "calendar", mobileTabEligible: true, desktopProminent: true },
  { key: "schedules", labelKey: "nav.schedules", fallbackLabel: "Schedules", href: "/schedules", icon: "schedules", placement: "primary", featureKey: "schedules", desktopProminent: true },
  { key: "family", labelKey: "nav.family", fallbackLabel: "Family", href: "/family/members", icon: "family", placement: "primary", featureKey: "family_members", desktopProminent: true },
  { key: "notifications", labelKey: "nav.notifications", fallbackLabel: "Notifications", href: "/notifications", icon: "notifications", placement: "more", featureKey: "notifications" },
  { key: "meals", labelKey: "nav.meals", fallbackLabel: "Meal Planner", href: "/meals", icon: "meals", placement: "more", featureKey: "meals" },
  { key: "chores", labelKey: "nav.chores", fallbackLabel: "Chores", href: "/chores", icon: "chores", placement: "more", featureKey: "chores" },
  { key: "rewards", labelKey: "nav.rewards", fallbackLabel: "Rewards", href: "/rewards", icon: "rewards", placement: "more", featureKey: "rewards" },
  { key: "notes", labelKey: "nav.notes", fallbackLabel: "Notes", href: "/notes", icon: "notes", placement: "more", featureKey: "notes" },
  { key: "messages", labelKey: "nav.messages", fallbackLabel: "Messages", href: "/messages", icon: "messages", placement: "more", featureKey: "messages" },
  { key: "expenses", labelKey: "nav.expenses", fallbackLabel: "Expenses", href: "/expenses", icon: "expenses", placement: "more", featureKey: "expenses" },
  { key: "documents", labelKey: "nav.documents", fallbackLabel: "Documents", href: "/documents", icon: "documents", placement: "more", featureKey: "documents" },
  { key: "routines", labelKey: "nav.routines", fallbackLabel: "Routines", href: "/routines", icon: "routines", placement: "more", featureKey: "routines" },
  { key: "family_settings", labelKey: "family.settingsTitle", fallbackLabel: "Family Settings", href: "/family/settings", icon: "family_settings", placement: "settings", featureKey: "family_settings" },
  { key: "settings", labelKey: "nav.settings", fallbackLabel: "Settings", href: "/settings", icon: "settings", placement: "settings", featureKey: "settings" }
];
