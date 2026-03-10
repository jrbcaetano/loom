"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/lib/i18n/context";

type NavItem = {
  href: string;
  labelKey: string;
  icon: string;
  iconBg: string;
  iconFg: string;
};

const primaryNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "\u2302", iconBg: "#e7efff", iconFg: "#4f7df3" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "\u2611", iconBg: "#ecebff", iconFg: "#6b5cf6" },
  { href: "/lists", labelKey: "nav.lists", icon: "\u2630", iconBg: "#e7f6ff", iconFg: "#0f9bd8" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "\u25EB", iconBg: "#fff1df", iconFg: "#f59e0b" },
  { href: "/notifications", labelKey: "nav.notifications", icon: "\u25B3", iconBg: "#fdecea", iconFg: "#e03131" }
];

const mobileBottomNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "\u2302", iconBg: "#e7efff", iconFg: "#4f7df3" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "\u2611", iconBg: "#ecebff", iconFg: "#6b5cf6" },
  { href: "/lists", labelKey: "nav.lists", icon: "\u2630", iconBg: "#e7f6ff", iconFg: "#0f9bd8" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "\u25EB", iconBg: "#fff1df", iconFg: "#f59e0b" }
];

const familyOpsNav: NavItem[] = [
  { href: "/meals", labelKey: "nav.meals", icon: "\u2318", iconBg: "#f3ecff", iconFg: "#7c3aed" },
  { href: "/chores", labelKey: "nav.chores", icon: "\u2605", iconBg: "#fff6d9", iconFg: "#e0a100" },
  { href: "/rewards", labelKey: "nav.rewards", icon: "\u25CE", iconBg: "#e5f5ff", iconFg: "#0c8599" },
  { href: "/notes", labelKey: "nav.notes", icon: "\u270E", iconBg: "#ffeaf2", iconFg: "#e64980" }
];

const recordsNav: NavItem[] = [
  { href: "/messages", labelKey: "nav.messages", icon: "\u2709", iconBg: "#e6f4ff", iconFg: "#2563eb" },
  { href: "/expenses", labelKey: "nav.expenses", icon: "$", iconBg: "#eafaf1", iconFg: "#16a34a" },
  { href: "/documents", labelKey: "nav.documents", icon: "\u2338", iconBg: "#f1f3f5", iconFg: "#495057" },
  { href: "/routines", labelKey: "nav.routines", icon: "\u21BB", iconBg: "#e6fcf5", iconFg: "#0ca678" }
];

const adminNav: NavItem[] = [
  { href: "/family/members", labelKey: "nav.family", icon: "\u25C9", iconBg: "#ecf0ff", iconFg: "#5f6ad4" },
  { href: "/family/settings", labelKey: "family.settingsTitle", icon: "\u2692", iconBg: "#eef6ff", iconFg: "#1d4ed8" },
  { href: "/settings", labelKey: "nav.settings", icon: "\u2699", iconBg: "#f1f3f5", iconFg: "#495057" }
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

  const mobileOverflowNav = useMemo(() => {
    const primaryHrefs = new Set(mobileBottomNav.map((item) => item.href));
    const sections = [primaryNav.find((item) => item.href === "/notifications"), ...familyOpsNav, ...recordsNav, ...adminNav].filter(Boolean) as NavItem[];
    return sections.filter((item) => !primaryHrefs.has(item.href));
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMobileMoreOpen(false);
  }, [pathname]);

  return (
    <div className="loom-shell">
      <aside className="loom-sidebar">
        <div className="px-2">
          <Link href="/home" className="loom-brand">
            <span className="loom-brand-badge">{"\u2302"}</span> Loom
          </Link>
        </div>

        <nav className="loom-nav-stack">
          {primaryNav.map((item) => (
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

        <p className="loom-nav-section-title"> </p>
        <nav className="loom-nav-stack">
          {familyOpsNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot" style={iconStyle(item)}>{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <p className="loom-nav-section-title"> </p>
        <nav className="loom-nav-stack">
          {recordsNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot" style={iconStyle(item)}>{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <p className="loom-nav-section-title"> </p>
        <nav className="loom-nav-stack">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot" style={iconStyle(item)}>{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

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
                <span className="loom-brand-badge">{"\u2302"}</span>
                <span>Loom</span>
              </Link>
              <div className="loom-mobile-header-actions">
                <Link href="/notifications" className="loom-mobile-header-action" aria-label={t("nav.notifications", "Notifications")}>
                  <span>{"\u25B3"}</span>
                  {unreadNotificationsCount > 0 ? <span className="loom-mobile-notification-badge">{unreadLabel}</span> : null}
                </Link>
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

      <nav className="loom-mobile-tabs" aria-label="Primary">
        {mobileBottomNav.map((item) => (
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
