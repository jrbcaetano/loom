"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { NavIcon } from "@/components/shell/nav-icon";
import type { LoomModeDefinition } from "@/features/navigation/mode-registry";

type SidebarNavProps = {
  pathname: string;
  items: LoomModeDefinition[];
  title?: string;
  t: (key: string, fallback?: string) => string;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
};

export function SidebarNav({
  pathname,
  items,
  title,
  t,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0
}: SidebarNavProps) {
  if (items.length === 0) {
    return null;
  }

  const unreadLabel = unreadNotificationsCount > 99 ? "99+" : String(unreadNotificationsCount);
  const unreadMessagesLabel = unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount);

  return (
    <div className="loom-nav-group">
      {title ? <p className="loom-nav-section-title">{title}</p> : null}
      <nav className="loom-nav-stack">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={clsx("loom-nav-link", isActive && "is-active")}>
              <span className="loom-nav-dot">
                <NavIcon name={item.icon} className="loom-nav-glyph" />
              </span>
              <span>{t(item.labelKey, item.fallbackLabel)}</span>
              {item.href === "/notifications" && unreadNotificationsCount > 0 ? (
                <span className="loom-nav-counter" aria-label={t("nav.notifications", "Notifications")}>
                  {unreadLabel}
                </span>
              ) : null}
              {item.href === "/messages" && unreadMessagesCount > 0 ? (
                <span className="loom-nav-counter" aria-label={t("nav.messages", "Messages")}>
                  {unreadMessagesLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
