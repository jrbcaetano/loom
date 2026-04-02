"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { NavIcon } from "@/components/shell/nav-icon";
import type { LoomModeDefinition } from "@/features/navigation/mode-registry";

type BottomTabBarProps = {
  pathname: string;
  items: LoomModeDefinition[];
  onMoreClick: () => void;
  moreLabel: string;
  t: (key: string, fallback?: string) => string;
};

export function BottomTabBar({ pathname, items, onMoreClick, moreLabel, t }: BottomTabBarProps) {
  return (
    <nav className="loom-mobile-tabs" aria-label="Primary" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={clsx("loom-mobile-tab", isActive && "is-active")}>
            <span className="loom-mobile-tab-icon">
              <NavIcon name={item.icon} className="loom-nav-glyph" />
            </span>
            <span>{t(item.labelKey, item.fallbackLabel)}</span>
          </Link>
        );
      })}
      <button type="button" className="loom-mobile-tab" onClick={onMoreClick} aria-label={moreLabel}>
        <span className="loom-mobile-tab-icon">
          <NavIcon name="more" className="loom-nav-glyph" />
        </span>
        <span>{moreLabel}</span>
      </button>
    </nav>
  );
}
