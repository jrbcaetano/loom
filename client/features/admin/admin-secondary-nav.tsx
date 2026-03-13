"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

const adminNav = [
  { href: "/admin/access", labelKey: "admin.nav.access", fallback: "Access" },
  { href: "/admin/features", labelKey: "admin.nav.features", fallback: "Features" },
  { href: "/admin/push", labelKey: "admin.nav.push", fallback: "Push" }
];

export function AdminSecondaryNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="loom-card p-4">
      <div className="loom-task-tabs loom-admin-subnav">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`loom-task-tab ${pathname === item.href ? "is-active" : ""}`}
          >
            {t(item.labelKey, item.fallback)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
