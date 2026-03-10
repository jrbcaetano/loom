"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";
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
  { href: "/profile", labelKey: "nav.profile", icon: "\u25CC", iconBg: "#eaf9ef", iconFg: "#16a34a" }
];

const mobilePrimaryNav: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: "\u2302", iconBg: "#e7efff", iconFg: "#4f7df3" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "\u2611", iconBg: "#ecebff", iconFg: "#6b5cf6" },
  { href: "/lists", labelKey: "nav.lists", icon: "\u2630", iconBg: "#e7f6ff", iconFg: "#0f9bd8" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "\u25EB", iconBg: "#fff1df", iconFg: "#f59e0b" },
  { href: "/profile", labelKey: "nav.profile", icon: "\u25CC", iconBg: "#eaf9ef", iconFg: "#16a34a" }
];

const familyOpsNav: NavItem[] = [
  { href: "/meals", labelKey: "nav.meals", icon: "\u2318", iconBg: "#f3ecff", iconFg: "#7c3aed" },
  { href: "/chores", labelKey: "nav.chores", icon: "\u2605", iconBg: "#fff6d9", iconFg: "#e0a100" },
  { href: "/notes", labelKey: "nav.notes", icon: "\u270E", iconBg: "#ffeaf2", iconFg: "#e64980" },
  { href: "/notifications", labelKey: "nav.notifications", icon: "\u25B3", iconBg: "#fdecea", iconFg: "#e03131" }
];

const recordsNav: NavItem[] = [
  { href: "/messages", labelKey: "nav.messages", icon: "\u2709", iconBg: "#e6f4ff", iconFg: "#2563eb" },
  { href: "/expenses", labelKey: "nav.expenses", icon: "$", iconBg: "#eafaf1", iconFg: "#16a34a" },
  { href: "/documents", labelKey: "nav.documents", icon: "\u2338", iconBg: "#f1f3f5", iconFg: "#495057" },
  { href: "/routines", labelKey: "nav.routines", icon: "\u21BB", iconBg: "#e6fcf5", iconFg: "#0ca678" }
];

const adminNav: NavItem[] = [
  { href: "/family/members", labelKey: "nav.family", icon: "\u25C9", iconBg: "#ecf0ff", iconFg: "#5f6ad4" },
  { href: "/settings", labelKey: "nav.settings", icon: "\u2699", iconBg: "#f1f3f5", iconFg: "#495057" }
];

const titleByPrefix: Array<{ prefix: string; titleKey: string }> = [
  { prefix: "/home", titleKey: "nav.home" },
  { prefix: "/lists", titleKey: "nav.lists" },
  { prefix: "/tasks", titleKey: "nav.tasks" },
  { prefix: "/calendar", titleKey: "nav.calendar" },
  { prefix: "/messages", titleKey: "nav.messages" },
  { prefix: "/meals", titleKey: "nav.meals" },
  { prefix: "/expenses", titleKey: "nav.expenses" },
  { prefix: "/documents", titleKey: "nav.documents" },
  { prefix: "/routines", titleKey: "nav.routines" },
  { prefix: "/notes", titleKey: "nav.notes" },
  { prefix: "/chores", titleKey: "nav.chores" },
  { prefix: "/rewards", titleKey: "nav.rewards" },
  { prefix: "/notifications", titleKey: "nav.notifications" },
  { prefix: "/family", titleKey: "nav.family" },
  { prefix: "/profile", titleKey: "nav.profile" },
  { prefix: "/settings", titleKey: "nav.settings" }
];

type AppShellProps = {
  userEmail: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  activeFamilyName?: string | null;
  children: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getTitleKey(pathname: string) {
  if (pathname.startsWith("/lists/") && pathname !== "/lists" && pathname !== "/lists/new") {
    return "app.name";
  }

  return titleByPrefix.find((item) => pathname.startsWith(item.prefix))?.titleKey ?? "app.name";
}

function iconStyle(item: NavItem): CSSProperties {
  return {
    ["--loom-icon-bg" as string]: item.iconBg,
    ["--loom-icon-fg" as string]: item.iconFg
  };
}

export function AppShell({ userEmail, userDisplayName, userAvatarUrl, activeFamilyName, children }: AppShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const title = t(getTitleKey(pathname));
  const initial = (userDisplayName ?? userEmail).slice(0, 1).toUpperCase();
  const _activeFamilyName = activeFamilyName;

  return (
    <div className="loom-shell">
      <aside className="loom-sidebar">
        <div className="px-2">
          <p className="loom-brand">
            <span className="loom-brand-badge">{"\u2302"}</span> Loom
          </p>
        </div>

        <nav className="loom-nav-stack">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot" style={iconStyle(item)}>{item.icon}</span>
              {t(item.labelKey)}
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
          <p className="loom-muted small">{userEmail}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="loom-main">
        <div className="loom-main-inner">
          <header className="loom-page-header" data-family={_activeFamilyName ?? ""}>
            <div className="loom-row-between">
              <div>
                <h1 className="loom-page-title">{title}</h1>
              </div>
              <div className="loom-header-actions">
                <Link href="/notifications" className="loom-header-icon" aria-label={t("nav.notifications")}>
                  {"\u25B3"}
                </Link>
                {userAvatarUrl ? (
                  <div className="loom-header-avatar has-image" style={{ backgroundImage: `url(${userAvatarUrl})` }} aria-hidden />
                ) : (
                  <div className="loom-header-avatar" aria-hidden>
                    {initial || "U"}
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="loom-main-body">{children}</div>
        </div>
      </main>

      <button className="loom-mobile-fab" type="button" aria-label="Quick add">
        +
      </button>

      <nav className="loom-mobile-tabs" aria-label="Primary">
        {mobilePrimaryNav.map((item) => (
          <Link key={item.href} href={item.href} className={clsx("loom-mobile-tab", isActive(pathname, item.href) && "is-active")}>
            <span className="loom-mobile-tab-icon" style={iconStyle(item)}>{item.icon}</span>
            <span>{t(item.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
