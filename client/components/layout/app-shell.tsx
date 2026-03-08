"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const primaryNav: NavItem[] = [
  { href: "/home", label: "Home", icon: "H" },
  { href: "/lists", label: "Lists", icon: "L" },
  { href: "/tasks", label: "Tasks", icon: "T" },
  { href: "/calendar", label: "Calendar", icon: "C" },
  { href: "/messages", label: "Messages", icon: "M" }
];

const mobilePrimaryNav: NavItem[] = [
  { href: "/home", label: "Home", icon: "H" },
  { href: "/lists", label: "Lists", icon: "L" },
  { href: "/tasks", label: "Tasks", icon: "T" },
  { href: "/calendar", label: "Calendar", icon: "C" }
];

const familyOpsNav: NavItem[] = [
  { href: "/meals", label: "Meals", icon: "ME" },
  { href: "/routines", label: "Routines", icon: "R" },
  { href: "/chores", label: "Chores", icon: "CH" },
  { href: "/rewards", label: "Rewards", icon: "RW" }
];

const recordsNav: NavItem[] = [
  { href: "/expenses", label: "Expenses", icon: "EX" },
  { href: "/documents", label: "Documents", icon: "D" },
  { href: "/notes", label: "Notes", icon: "NO" }
];

const adminNav: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: "N" },
  { href: "/family/members", label: "Family", icon: "F" },
  { href: "/profile", label: "Profile", icon: "P" },
  { href: "/settings", label: "Settings", icon: "S" }
];

const titleByPrefix: Array<{ prefix: string; title: string }> = [
  { prefix: "/home", title: "Home" },
  { prefix: "/lists", title: "Lists" },
  { prefix: "/tasks", title: "Tasks" },
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/messages", title: "Messages" },
  { prefix: "/meals", title: "Meals" },
  { prefix: "/expenses", title: "Expenses" },
  { prefix: "/documents", title: "Documents" },
  { prefix: "/routines", title: "Routines" },
  { prefix: "/notes", title: "Notes" },
  { prefix: "/chores", title: "Chores" },
  { prefix: "/rewards", title: "Rewards" },
  { prefix: "/notifications", title: "Notifications" },
  { prefix: "/family", title: "Family" },
  { prefix: "/profile", title: "Profile" },
  { prefix: "/settings", title: "Settings" }
];

type AppShellProps = {
  userEmail: string;
  activeFamilyName?: string | null;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getTitle(pathname: string) {
  return titleByPrefix.find((item) => pathname.startsWith(item.prefix))?.title ?? "Loom";
}

export function AppShell({ userEmail, activeFamilyName, children }: AppShellProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="loom-shell">
      <aside className="loom-sidebar">
        <div>
          <p className="loom-brand">Loom</p>
          <p className="loom-muted small">{activeFamilyName ?? "No active family"}</p>
        </div>

        <nav className="loom-nav-stack">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="loom-nav-section-title">Family Ops</p>
        <nav className="loom-nav-stack">
          {familyOpsNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="loom-nav-section-title">Records</p>
        <nav className="loom-nav-stack">
          {recordsNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="loom-nav-section-title">Settings</p>
        <nav className="loom-nav-stack">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive(pathname, item.href) && "is-active")}>
              <span className="loom-nav-dot">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="loom-sidebar-footer">
          <p className="loom-muted small">{userEmail}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="loom-main">
        <header className="loom-page-header">
          <div>
            <h1 className="loom-page-title">{title}</h1>
            {activeFamilyName ? <p className="loom-page-subtitle">{activeFamilyName}</p> : null}
          </div>
        </header>
        <div className="loom-main-body">{children}</div>
      </main>

      <nav className="loom-mobile-tabs" aria-label="Primary">
        {mobilePrimaryNav.map((item) => (
          <Link key={item.href} href={item.href} className={clsx("loom-mobile-tab", isActive(pathname, item.href) && "is-active")}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <Link href="/settings" className={clsx("loom-mobile-tab", pathname.startsWith("/settings") && "is-active")}>
          <span>M</span>
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
