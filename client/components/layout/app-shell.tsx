"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SVGProps } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/lib/i18n/context";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  normalizeProductFeatureAvailability,
  type ProductFeatureAvailability,
  type ProductFeatureKey
} from "@/lib/product-features";

type NavItem = {
  href: string;
  labelKey: string;
  icon: NavIconName;
  featureKey?: ProductFeatureKey;
};

type NavIconName =
  | "home"
  | "tasks"
  | "lists"
  | "calendar"
  | "schedules"
  | "notifications"
  | "meals"
  | "chores"
  | "rewards"
  | "notes"
  | "messages"
  | "expenses"
  | "documents"
  | "routines"
  | "family"
  | "family_settings"
  | "settings"
  | "product_admin"
  | "more";

function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const commonProps: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps} className={className}>
          <path d="M3.75 10.75 12 4l8.25 6.75v8a1.25 1.25 0 0 1-1.25 1.25H5a1.25 1.25 0 0 1-1.25-1.25z" />
          <path d="M9.25 20v-5h5.5v5" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...commonProps} className={className}>
          <rect x="4" y="3.75" width="16" height="16.5" rx="2.25" />
          <path d="m8.5 12.25 2.2 2.2 4.8-4.8" />
        </svg>
      );
    case "lists":
      return (
        <svg {...commonProps} className={className}>
          <path d="M9 6.5h10.5M9 12h10.5M9 17.5h10.5" />
          <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps} className={className}>
          <rect x="3.5" y="5.25" width="17" height="15.25" rx="2.25" />
          <path d="M16.5 3.5v3.5M7.5 3.5v3.5M3.5 9.25h17" />
        </svg>
      );
    case "schedules":
      return (
        <svg {...commonProps} className={className}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 7.75v4.75l3 1.75" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...commonProps} className={className}>
          <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0v3.25c0 1.2.55 2.35 1.5 3.1H5c.95-.75 1.5-1.9 1.5-3.1z" />
          <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" />
        </svg>
      );
    case "meals":
      return (
        <svg {...commonProps} className={className}>
          <path d="M7.25 3.5v8.75M4.75 3.5v4.25a2.5 2.5 0 0 0 2.5 2.5M9.75 3.5v4.25a2.5 2.5 0 0 1-2.5 2.5M7.25 12.25V20" />
          <path d="M16.5 3.5c1.66 0 3 1.34 3 3v5.75h-4.5V6.5c0-1.66.84-3 1.5-3Z" />
          <path d="M17.25 12.25V20" />
        </svg>
      );
    case "chores":
      return (
        <svg {...commonProps} className={className}>
          <path d="m12 4.5 2.1 4.25 4.7.68-3.4 3.32.8 4.69L12 15.1l-4.2 2.34.8-4.7-3.4-3.3 4.7-.69z" />
        </svg>
      );
    case "rewards":
      return (
        <svg {...commonProps} className={className}>
          <path d="M8 4.25h8v3.5a4 4 0 0 1-8 0z" />
          <path d="M8 5.25H6.75A2.75 2.75 0 0 0 4 8c0 1.52 1.23 2.75 2.75 2.75H8M16 5.25h1.25A2.75 2.75 0 0 1 20 8a2.75 2.75 0 0 1-2.75 2.75H16" />
          <path d="M12 11.75V16.5M9 20h6" />
        </svg>
      );
    case "notes":
      return (
        <svg {...commonProps} className={className}>
          <path d="M6 3.75h8.5l3.5 3.5V20.25H6a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" />
          <path d="M14.5 3.75v3.5H18M8 11h8M8 15h6" />
        </svg>
      );
    case "messages":
      return (
        <svg {...commonProps} className={className}>
          <path d="M5.5 5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3h-1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M8 10h8M8 13.5h5.5" />
        </svg>
      );
    case "expenses":
      return (
        <svg {...commonProps} className={className}>
          <rect x="3.5" y="6.25" width="17" height="11.5" rx="2.25" />
          <path d="M16.75 12h.01M3.5 9h17" />
        </svg>
      );
    case "documents":
      return (
        <svg {...commonProps} className={className}>
          <path d="M7 3.75h7.75L19 8v12.25a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14.5a2 2 0 0 1 2-2Z" />
          <path d="M14.75 3.75V8H19M8.25 12h7.5M8.25 15.5h7.5M8.25 19h5" />
        </svg>
      );
    case "routines":
      return (
        <svg {...commonProps} className={className}>
          <path d="M20 12a8 8 0 0 1-13.66 5.66M4 12a8 8 0 0 1 13.66-5.66" />
          <path d="M6.34 17.66H3.5V20.5M17.66 6.34H20.5V3.5" />
        </svg>
      );
    case "family":
      return (
        <svg {...commonProps} className={className}>
          <path d="M16.5 20v-1.5a3 3 0 0 0-3-3h-3a3 3 0 0 0-3 3V20M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
          <path d="M19.5 20v-1a2.5 2.5 0 0 0-2.5-2.5M4.5 20v-1A2.5 2.5 0 0 1 7 16.5" />
        </svg>
      );
    case "family_settings":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 6.5h7M14 6.5h6M10 6.5a2 2 0 1 0 0 0ZM4 12h3M10 12h10M8 12a2 2 0 1 0 0 0ZM4 17.5h9M16 17.5h4M14 17.5a2 2 0 1 0 0 0Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 9.25A2.75 2.75 0 1 1 12 14.75 2.75 2.75 0 0 1 12 9.25Z" />
          <path d="M19.4 13.1a1 1 0 0 0 .2 1.1l.04.04a1.75 1.75 0 1 1-2.47 2.47l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.92V18a1.75 1.75 0 1 1-3.5 0v-.07a1 1 0 0 0-.6-.92 1 1 0 0 0-1.1.2l-.04.04a1.75 1.75 0 0 1-2.47-2.47l.04-.04a1 1 0 0 0 .2-1.1 1 1 0 0 0-.92-.6H6a1.75 1.75 0 1 1 0-3.5h.07a1 1 0 0 0 .92-.6 1 1 0 0 0-.2-1.1l-.04-.04a1.75 1.75 0 0 1 2.47-2.47l.04.04a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.92V6a1.75 1.75 0 1 1 3.5 0v.07a1 1 0 0 0 .6.92 1 1 0 0 0 1.1-.2l.04-.04a1.75 1.75 0 1 1 2.47 2.47l-.04.04a1 1 0 0 0-.2 1.1 1 1 0 0 0 .92.6H18a1.75 1.75 0 1 1 0 3.5h-.07a1 1 0 0 0-.92.6Z" />
        </svg>
      );
    case "product_admin":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 3.75 5.25 6.5v5.58c0 4.02 2.73 7.74 6.75 9.17 4.02-1.43 6.75-5.15 6.75-9.17V6.5z" />
          <path d="m9.25 12.5 1.9 1.9 3.6-3.6" />
        </svg>
      );
    case "more":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    default:
      return null;
  }
}

const primaryNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "home" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "tasks", featureKey: "tasks" },
  { href: "/lists", labelKey: "nav.lists", icon: "lists", featureKey: "lists" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "calendar", featureKey: "calendar" },
  { href: "/schedules", labelKey: "nav.schedules", icon: "schedules", featureKey: "schedules" },
  {
    href: "/notifications",
    labelKey: "nav.notifications",
    icon: "notifications",
    featureKey: "notifications"
  }
];

const mobileBottomNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "home" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "tasks", featureKey: "tasks" },
  { href: "/lists", labelKey: "nav.lists", icon: "lists", featureKey: "lists" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "calendar", featureKey: "calendar" },
  { href: "/schedules", labelKey: "nav.schedules", icon: "schedules", featureKey: "schedules" }
];

const familyOpsNav: NavItem[] = [
  { href: "/meals", labelKey: "nav.meals", icon: "meals", featureKey: "meals" },
  { href: "/chores", labelKey: "nav.chores", icon: "chores", featureKey: "chores" },
  { href: "/rewards", labelKey: "nav.rewards", icon: "rewards", featureKey: "rewards" },
  { href: "/notes", labelKey: "nav.notes", icon: "notes", featureKey: "notes" }
];

const recordsNav: NavItem[] = [
  { href: "/messages", labelKey: "nav.messages", icon: "messages", featureKey: "messages" },
  { href: "/expenses", labelKey: "nav.expenses", icon: "expenses", featureKey: "expenses" },
  {
    href: "/documents",
    labelKey: "nav.documents",
    icon: "documents",
    featureKey: "documents"
  },
  { href: "/routines", labelKey: "nav.routines", icon: "routines", featureKey: "routines" }
];

const adminNav: NavItem[] = [
  { href: "/family/members", labelKey: "nav.family", icon: "family", featureKey: "family_members" },
  {
    href: "/family/settings",
    labelKey: "family.settingsTitle",
    icon: "family_settings",
    featureKey: "family_settings"
  },
  { href: "/settings", labelKey: "nav.settings", icon: "settings", featureKey: "settings" }
];

const productAdminNavItem: NavItem = {
  href: "/admin",
  labelKey: "nav.productAdmin",
  icon: "product_admin"
};

type AppShellProps = {
  userEmail: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  activeFamilyName?: string | null;
  activeFamilyId?: string | null;
  isProductAdmin?: boolean;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  featureAvailability?: Partial<ProductFeatureAvailability> | null;
  children: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  userEmail,
  userDisplayName,
  userAvatarUrl,
  activeFamilyName,
  activeFamilyId,
  isProductAdmin = false,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  featureAvailability,
  children
}: AppShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [liveUnreadNotificationsCount, setLiveUnreadNotificationsCount] = useState(unreadNotificationsCount);
  const [liveUnreadMessagesCount, setLiveUnreadMessagesCount] = useState(unreadMessagesCount);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);
  const profileName = (userDisplayName ?? "").trim() || userEmail || t("nav.profile", "Profile");
  const initial = profileName.slice(0, 1).toUpperCase();
  const _activeFamilyName = activeFamilyName;
  const unreadLabel = liveUnreadNotificationsCount > 99 ? "99+" : String(liveUnreadNotificationsCount);
  const unreadMessagesLabel = liveUnreadMessagesCount > 99 ? "99+" : String(liveUnreadMessagesCount);
  const normalizedFeatureAvailability = useMemo(
    () => normalizeProductFeatureAvailability(featureAvailability),
    [featureAvailability]
  );

  const visiblePrimaryNav = useMemo(
    () =>
      primaryNav.filter(
        (item) => !item.featureKey || normalizedFeatureAvailability[item.featureKey]
      ),
    [normalizedFeatureAvailability]
  );
  const visibleMobileBottomNav = useMemo(
    () =>
      mobileBottomNav.filter(
        (item) => !item.featureKey || normalizedFeatureAvailability[item.featureKey]
      ),
    [normalizedFeatureAvailability]
  );
  const visibleFamilyOpsNav = useMemo(
    () =>
      familyOpsNav.filter(
        (item) => !item.featureKey || normalizedFeatureAvailability[item.featureKey]
      ),
    [normalizedFeatureAvailability]
  );
  const visibleRecordsNav = useMemo(
    () =>
      recordsNav.filter(
        (item) => !item.featureKey || normalizedFeatureAvailability[item.featureKey]
      ),
    [normalizedFeatureAvailability]
  );
  const visibleAdminNav = useMemo(
    () =>
      adminNav.filter(
        (item) => !item.featureKey || normalizedFeatureAvailability[item.featureKey]
      ),
    [normalizedFeatureAvailability]
  );
  const isNotificationsEnabled = normalizedFeatureAvailability.notifications;
  const isMessagesEnabled = normalizedFeatureAvailability.messages;

  const mobileOverflowNav = useMemo(() => {
    const primaryHrefs = new Set(visibleMobileBottomNav.map((item) => item.href));
    const sections = [
      visiblePrimaryNav.find((item) => item.href === "/notifications"),
      ...visibleFamilyOpsNav,
      ...visibleRecordsNav,
      ...visibleAdminNav
    ].filter(Boolean) as NavItem[];
    return sections.filter((item) => !primaryHrefs.has(item.href));
  }, [visibleAdminNav, visibleFamilyOpsNav, visibleMobileBottomNav, visiblePrimaryNav, visibleRecordsNav]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMobileMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    setLiveUnreadNotificationsCount(unreadNotificationsCount);
  }, [unreadNotificationsCount]);

  useEffect(() => {
    setLiveUnreadMessagesCount(unreadMessagesCount);
  }, [unreadMessagesCount]);

  useEffect(() => {
    setIsDocumentVisible(document.visibilityState === "visible");

    const onVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const refreshUnreadBadges = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 15_000) {
      return refreshInFlightRef.current ?? Promise.resolve();
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const params = new URLSearchParams();
    if (activeFamilyId) {
      params.set("familyId", activeFamilyId);
    }

    const refreshPromise = (async () => {
      const response = await fetch(`/api/unread-badges?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as {
        unreadNotificationsCount?: number;
        unreadMessagesCount?: number;
      };
      if (!response.ok) {
        throw new Error("Failed to refresh unread badges");
      }

      lastRefreshAtRef.current = Date.now();
      setLiveUnreadNotificationsCount(payload.unreadNotificationsCount ?? 0);
      setLiveUnreadMessagesCount(payload.unreadMessagesCount ?? 0);
    })();

    refreshInFlightRef.current = refreshPromise;
    try {
      await refreshPromise;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [activeFamilyId]);

  useEffect(() => {
    if (!isDocumentVisible) {
      return;
    }

    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 120_000;

    const schedule = (delay: number) => {
      if (isCancelled) return;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void tick();
      }, delay);
    };

    const tick = async () => {
      if (isCancelled || document.visibilityState !== "visible") {
        return;
      }

      try {
        await refreshUnreadBadges();
        backoffMs = 120_000;
        schedule(backoffMs);
      } catch {
        backoffMs = Math.min(backoffMs * 2, 120_000);
        schedule(backoffMs);
      }
    };

    const onFocus = () => {
      void refreshUnreadBadges(true);
    };

    const onOnline = () => {
      void refreshUnreadBadges(true);
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    schedule(backoffMs);

    return () => {
      isCancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [isDocumentVisible, refreshUnreadBadges]);

  useEffect(() => {
    if (!isDocumentVisible) {
      return;
    }

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("unread-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void refreshUnreadBadges();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isDocumentVisible, refreshUnreadBadges]);

  return (
    <div className="loom-shell">
      <aside className="loom-sidebar">
        <div className="px-2">
          <Link href="/home" className="loom-brand">
            <Image src="/brand/loom-symbol.png" alt="" width={30} height={30} className="loom-brand-badge" aria-hidden />
            <span>Loom</span>
          </Link>
        </div>

        {[
          { id: "primary", items: visiblePrimaryNav },
          { id: "family", items: visibleFamilyOpsNav },
          { id: "records", items: visibleRecordsNav },
          { id: "admin", items: visibleAdminNav }
        ]
          .filter((group) => group.items.length > 0)
          .map((group, index) => (
            <div key={group.id} className={clsx("loom-nav-group", index > 0 && "is-separated")}>
              <nav className="loom-nav-stack">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
                    <span className="loom-nav-dot"><NavIcon name={item.icon} className="loom-nav-glyph" /></span>
                    <span>{t(item.labelKey)}</span>
                    {item.href === "/notifications" && liveUnreadNotificationsCount > 0 ? (
                      <span className="loom-nav-counter" aria-label={t("nav.notifications", "Notifications")}>
                        {unreadLabel}
                      </span>
                    ) : null}
                    {item.href === "/messages" && liveUnreadMessagesCount > 0 ? (
                      <span className="loom-nav-counter" aria-label={t("nav.messages", "Messages")}>
                        {unreadMessagesLabel}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

        <div className="loom-sidebar-footer">
          {isProductAdmin ? (
            <Link
              href={productAdminNavItem.href}
              className={clsx("loom-nav-link mb-3", isActive(pathname, productAdminNavItem.href) && "is-active")}
            >
              <span className="loom-nav-dot"><NavIcon name={productAdminNavItem.icon} className="loom-nav-glyph" /></span>
              {t(productAdminNavItem.labelKey)}
            </Link>
          ) : null}
          <div className="loom-profile-menu-anchor">
            <button type="button" className="loom-profile-trigger" onClick={() => setIsProfileMenuOpen((value) => !value)}>
              {userAvatarUrl ? (
                <span className="loom-profile-avatar has-image" style={{ backgroundImage: `url(${userAvatarUrl})` }} aria-hidden />
              ) : (
                <span className="loom-profile-avatar" aria-hidden>
                  {initial || "U"}
                </span>
              )}
              <span className="loom-profile-meta">
                <span className="loom-profile-name">{profileName}</span>
                <span className="loom-profile-email">{userEmail}</span>
              </span>
              <span className="loom-profile-caret" aria-hidden>
                {isProfileMenuOpen ? "\u25B4" : "\u25BE"}
              </span>
            </button>
            {isProfileMenuOpen ? (
              <div className="loom-profile-menu">
                <Link href="/profile" className="loom-profile-menu-item">
                  {t("nav.editProfile", "Edit Profile")}
                </Link>
                <SignOutButton className="loom-profile-menu-item loom-signout-danger" />
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="loom-main">
        <div className="loom-main-inner">
          <header className="loom-mobile-header">
            <div className="loom-mobile-header-inner">
              <Link href="/home" className="loom-mobile-brand">
                <Image src="/brand/loom-symbol.png" alt="" width={30} height={30} className="loom-brand-badge" aria-hidden />
                <span>Loom</span>
              </Link>
              <div className="loom-mobile-header-actions">
                {isMessagesEnabled ? (
                  <Link href="/messages" className="loom-mobile-header-action" aria-label={t("nav.messages", "Messages")}>
                    <NavIcon name="messages" className="loom-nav-glyph" />
                    {liveUnreadMessagesCount > 0 ? <span className="loom-mobile-notification-badge">{unreadMessagesLabel}</span> : null}
                  </Link>
                ) : null}
                {isNotificationsEnabled ? (
                  <Link href="/notifications" className="loom-mobile-header-action" aria-label={t("nav.notifications", "Notifications")}>
                    <NavIcon name="notifications" className="loom-nav-glyph" />
                    {liveUnreadNotificationsCount > 0 ? <span className="loom-mobile-notification-badge">{unreadLabel}</span> : null}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="loom-mobile-header-action"
                  aria-label={t("nav.more", "More")}
                  onClick={() => setIsMobileMoreOpen((value) => !value)}
                >
                  <NavIcon name="more" className="loom-nav-glyph" />
                </button>
              </div>
            </div>
          </header>
          <div className="loom-main-body" data-family={_activeFamilyName ?? ""}>{children}</div>
        </div>
      </main>

      <nav
        className="loom-mobile-tabs"
        aria-label="Primary"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, visibleMobileBottomNav.length)}, minmax(0, 1fr))` }}
      >
        {visibleMobileBottomNav.map((item) => (
          <Link key={item.href} href={item.href} className={clsx("loom-mobile-tab", isActive(pathname, item.href) && "is-active")}>
            <span className="loom-mobile-tab-icon"><NavIcon name={item.icon} className="loom-nav-glyph" /></span>
            <span>{t(item.labelKey)}</span>
          </Link>
        ))}
      </nav>

      {isMobileMoreOpen ? (
        <>
          <button type="button" className="loom-mobile-more-backdrop" aria-label={t("common.cancel", "Cancel")} onClick={() => setIsMobileMoreOpen(false)} />
          <aside className="loom-mobile-more-panel" aria-label={t("nav.more", "More")}>
            <div className="loom-mobile-more-section">
              <button type="button" className="loom-profile-trigger" onClick={() => setIsProfileMenuOpen((value) => !value)}>
                {userAvatarUrl ? (
                  <span className="loom-profile-avatar has-image" style={{ backgroundImage: `url(${userAvatarUrl})` }} aria-hidden />
                ) : (
                  <span className="loom-profile-avatar" aria-hidden>
                    {initial || "U"}
                  </span>
                )}
                <span className="loom-profile-meta">
                  <span className="loom-profile-name">{profileName}</span>
                  <span className="loom-profile-email">{userEmail}</span>
                </span>
                <span className="loom-profile-caret" aria-hidden>
                  {isProfileMenuOpen ? "\u25B4" : "\u25BE"}
                </span>
              </button>
              {isProfileMenuOpen ? (
                <div className="loom-profile-menu">
                  <Link href="/profile" className="loom-profile-menu-item">
                    {t("nav.editProfile", "Edit Profile")}
                  </Link>
                  <SignOutButton className="loom-profile-menu-item loom-signout-danger" />
                </div>
              ) : null}
            </div>

            <div className="loom-mobile-more-section">
              {mobileOverflowNav.map((item) => (
                <Link key={item.href} href={item.href} className={clsx("loom-mobile-more-link", isActive(pathname, item.href) && "is-active")}>
                  <span className="loom-nav-dot"><NavIcon name={item.icon} className="loom-nav-glyph" /></span>
                  <span>{t(item.labelKey)}</span>
                  {item.href === "/messages" && liveUnreadMessagesCount > 0 ? (
                    <span className="loom-nav-counter" aria-label={t("nav.messages", "Messages")}>
                      {unreadMessagesLabel}
                    </span>
                  ) : null}
                </Link>
              ))}
              {isProductAdmin ? (
                <Link href={productAdminNavItem.href} className={clsx("loom-mobile-more-link", isActive(pathname, productAdminNavItem.href) && "is-active")}>
                  <span className="loom-nav-dot"><NavIcon name={productAdminNavItem.icon} className="loom-nav-glyph" /></span>
                  <span>{t(productAdminNavItem.labelKey)}</span>
                </Link>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
