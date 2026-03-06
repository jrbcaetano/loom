"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { UserSpace } from "@/lib/data/spaces";
import { SignOutButton } from "@/components/sign-out-button";

type AppShellProps = {
  title: string;
  subtitle: string;
  userEmail: string | null | undefined;
  spaces: UserSpace[];
  activeSpaceId?: string;
  rightPanel?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, subtitle, userEmail, spaces, activeSpaceId, rightPanel, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const activeView = useMemo(() => {
    if (pathname?.includes("/admin")) {
      return "spaces";
    }

    return "inbox";
  }, [pathname]);

  return (
    <main className="loom-shell">
      <button
        type="button"
        aria-label="Close navigation"
        className={`loom-nav-backdrop${navOpen ? " is-open" : ""}`}
        onClick={() => setNavOpen(false)}
      />

      <aside className={`loom-sidebar${navOpen ? " is-open" : ""}`}>
        <div className="loom-profile">
          <div className="loom-avatar">{(userEmail ?? "L").charAt(0).toUpperCase()}</div>
          <div>
            <p className="loom-profile-name">{(userEmail ?? "Loom user").split("@")[0]}</p>
            <p className="loom-profile-subtitle">Workspace Account</p>
          </div>
        </div>

        <nav className="loom-nav-section">
          <p className="loom-nav-label">Views</p>
          <Link
            href="/dashboard"
            className={`loom-nav-link${activeView === "inbox" ? " is-active" : ""}`}
            onClick={() => setNavOpen(false)}
          >
            <span className="loom-nav-icon">o</span>
            Inbox
          </Link>
          <span className="loom-nav-link is-disabled" aria-disabled="true">
            <span className="loom-nav-icon">o</span>
            Today
          </span>
          <span className="loom-nav-link is-disabled" aria-disabled="true">
            <span className="loom-nav-icon">o</span>
            Upcoming
          </span>
        </nav>

        <nav className="loom-nav-section">
          <p className="loom-nav-label">Spaces</p>
          {spaces.length === 0 ? <p className="loom-empty-text">No spaces yet.</p> : null}
          {spaces.map((space) => {
            const activeClass = space.id === activeSpaceId ? " is-active" : "";
            const href = space.role === "admin" ? `/dashboard/spaces/${space.id}/admin` : "/dashboard";
            return (
              <Link key={space.id} href={href} className={`loom-space-link${activeClass}`} onClick={() => setNavOpen(false)}>
                <span className="loom-space-name">{space.name}</span>
                <span className="loom-role-chip">{space.role}</span>
              </Link>
            );
          })}
        </nav>

        <div className="loom-sidebar-footer">
          <Link
            href="/dashboard#create-space-section"
            className="loom-button-primary loom-button-block"
            onClick={() => setNavOpen(false)}
          >
            New Space
          </Link>
        </div>
      </aside>

      <section className="loom-content">
        <div className="loom-content-inner">
          <div className="loom-workspace-grid">
            <div className="loom-center">
              <header className="loom-topbar">
                <div className="loom-topbar-title">
                  <button type="button" className="loom-mobile-nav-toggle" onClick={() => setNavOpen((value) => !value)}>
                    {navOpen ? "Close" : "Menu"}
                  </button>
                  <div>
                    <p className="loom-user-email">Good day</p>
                    <h2 className="loom-page-title">{title}</h2>
                    <p className="loom-page-subtitle">{subtitle}</p>
                  </div>
                </div>
              </header>
              <div className="loom-main-stack">{children}</div>
            </div>

            <aside className="loom-right-rail">
              <div className="loom-right-rail-header">
                <div className="loom-search-faux">Filter</div>
                <SignOutButton />
              </div>
              {rightPanel}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

