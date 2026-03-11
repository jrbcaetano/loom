"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/lib/i18n/context";
import {
  normalizeProductFeatureAvailability,
  type ProductFeatureAvailability,
  type ProductFeatureKey
} from "@/lib/product-features";

type NavItem = {
  href: string;
  labelKey: string;
  icon: string;
  iconBg: string;
  iconFg: string;
  featureKey?: ProductFeatureKey;
};

const primaryNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "\u2302", iconBg: "#e7efff", iconFg: "#4f7df3" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "\u2611", iconBg: "#ecebff", iconFg: "#6b5cf6", featureKey: "tasks" },
  { href: "/lists", labelKey: "nav.lists", icon: "\u2630", iconBg: "#e7f6ff", iconFg: "#0f9bd8", featureKey: "lists" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "\u25EB", iconBg: "#fff1df", iconFg: "#f59e0b", featureKey: "calendar" },
  {
    href: "/notifications",
    labelKey: "nav.notifications",
    icon: "\u25B3",
    iconBg: "#fdecea",
    iconFg: "#e03131",
    featureKey: "notifications"
  }
];

const mobileBottomNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "\u2302", iconBg: "#e7efff", iconFg: "#4f7df3" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "\u2611", iconBg: "#ecebff", iconFg: "#6b5cf6", featureKey: "tasks" },
  { href: "/lists", labelKey: "nav.lists", icon: "\u2630", iconBg: "#e7f6ff", iconFg: "#0f9bd8", featureKey: "lists" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "\u25EB", iconBg: "#fff1df", iconFg: "#f59e0b", featureKey: "calendar" }
];

const familyOpsNav: NavItem[] = [
  { href: "/meals", labelKey: "nav.meals", icon: "\u2318", iconBg: "#f3ecff", iconFg: "#7c3aed", featureKey: "meals" },
  { href: "/chores", labelKey: "nav.chores", icon: "\u2605", iconBg: "#fff6d9", iconFg: "#e0a100", featureKey: "chores" },
  { href: "/rewards", labelKey: "nav.rewards", icon: "\u25CE", iconBg: "#e5f5ff", iconFg: "#0c8599", featureKey: "rewards" },
  { href: "/notes", labelKey: "nav.notes", icon: "\u270E", iconBg: "#ffeaf2", iconFg: "#e64980", featureKey: "notes" }
];

const recordsNav: NavItem[] = [
  { href: "/messages", labelKey: "nav.messages", icon: "\u2709", iconBg: "#e6f4ff", iconFg: "#2563eb", featureKey: "messages" },
  { href: "/expenses", labelKey: "nav.expenses", icon: "$", iconBg: "#eafaf1", iconFg: "#16a34a", featureKey: "expenses" },
  {
    href: "/documents",
    labelKey: "nav.documents",
    icon: "\u2338",
    iconBg: "#f1f3f5",
    iconFg: "#495057",
    featureKey: "documents"
  },
  { href: "/routines", labelKey: "nav.routines", icon: "\u21BB", iconBg: "#e6fcf5", iconFg: "#0ca678", featureKey: "routines" }
];

const adminNav: NavItem[] = [
  { href: "/family/members", labelKey: "nav.family", icon: "\u25C9", iconBg: "#ecf0ff", iconFg: "#5f6ad4", featureKey: "family_members" },
  {
    href: "/family/settings",
    labelKey: "family.settingsTitle",
    icon: "\u2692",
    iconBg: "#eef6ff",
    iconFg: "#1d4ed8",
    featureKey: "family_settings"
  },
  { href: "/settings", labelKey: "nav.settings", icon: "\u2699", iconBg: "#f1f3f5", iconFg: "#495057", featureKey: "settings" }
];

const productAdminNavItem: NavItem = {
  href: "/admin",
  labelKey: "nav.productAdmin",
  icon: "\u26E8",
  iconBg: "#fef3c7",
  iconFg: "#b45309"
};

type AppShellProps = {
  userEmail: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  activeFamilyName?: string | null;
  isProductAdmin?: boolean;
  unreadNotificationsCount?: number;
  featureAvailability?: Partial<ProductFeatureAvailability> | null;
  children: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function iconStyle(item: NavItem): CSSProperties {
  return {
    ["--loom-icon-bg" as string]: item.iconBg,
    ["--loom-icon-fg" as string]: item.iconFg
  };
}

export function AppShell({
  userEmail,
  userDisplayName,
  userAvatarUrl,
  activeFamilyName,
  isProductAdmin = false,
  unreadNotificationsCount = 0,
  featureAvailability,
  children
}: AppShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const profileName = (userDisplayName ?? "").trim() || userEmail || t("nav.profile", "Profile");
  const initial = profileName.slice(0, 1).toUpperCase();
  const _activeFamilyName = activeFamilyName;
  const unreadLabel = unreadNotificationsCount > 99 ? "99+" : String(unreadNotificationsCount);
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

  return (
    <div className="loom-shell">
      <aside className="loom-sidebar">
        <div className="px-2">
          <Link href="/home" className="loom-brand">
            <Image src="/brand/loom-symbol.png" alt="" width={50} height={50} className="loom-brand-badge" aria-hidden />
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
            <div key={group.id}>
              {index > 0 ? <p className="loom-nav-section-title"> </p> : null}
              <nav className="loom-nav-stack">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
                    <span className="loom-nav-dot" style={iconStyle(item)}>{item.icon}</span>
                    <span>{t(item.labelKey)}</span>
                    {item.href === "/notifications" && unreadNotificationsCount > 0 ? (
                      <span className="loom-nav-counter" aria-label={t("nav.notifications", "Notifications")}>
                        {unreadLabel}
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
              <span className="loom-nav-dot" style={iconStyle(productAdminNavItem)}>{productAdminNavItem.icon}</span>
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
                <Image src="/brand/loom-symbol.png" alt="" width={50} height={50} className="loom-brand-badge" aria-hidden />
                <span>Loom</span>
              </Link>
              <div className="loom-mobile-header-actions">
                {isNotificationsEnabled ? (
                  <Link href="/notifications" className="loom-mobile-header-action" aria-label={t("nav.notifications", "Notifications")}>
                    <span>{"\u25B3"}</span>
                    {unreadNotificationsCount > 0 ? <span className="loom-mobile-notification-badge">{unreadLabel}</span> : null}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="loom-mobile-header-action"
                  aria-label={t("nav.more", "More")}
                  onClick={() => setIsMobileMoreOpen((value) => !value)}
                >
                  {"\u2630"}
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
            <span className="loom-mobile-tab-icon" style={iconStyle(item)}>{item.icon}</span>
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
                  <span className="loom-nav-dot" style={iconStyle(item)}>{item.icon}</span>
                  <span>{t(item.labelKey)}</span>
                </Link>
              ))}
              {isProductAdmin ? (
                <Link href={productAdminNavItem.href} className={clsx("loom-mobile-more-link", isActive(pathname, productAdminNavItem.href) && "is-active")}>
                  <span className="loom-nav-dot" style={iconStyle(productAdminNavItem)}>{productAdminNavItem.icon}</span>
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
