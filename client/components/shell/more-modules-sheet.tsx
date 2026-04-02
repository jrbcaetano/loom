"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { NavIcon } from "@/components/shell/nav-icon";
import type { LoomModeDefinition } from "@/features/navigation/mode-registry";
import { SignOutButton } from "@/components/sign-out-button";

type MoreModulesSheetProps = {
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: Array<{ title: string; items: LoomModeDefinition[] }>;
  profileName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  initial: string;
  isProfileMenuOpen: boolean;
  onToggleProfileMenu: () => void;
  t: (key: string, fallback?: string) => string;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  isProductAdmin?: boolean;
  productAdminLabel?: string;
  productAdminHref?: string;
};

export function MoreModulesSheet({
  pathname,
  isOpen,
  onClose,
  title,
  sections,
  profileName,
  userEmail,
  userAvatarUrl,
  initial,
  isProfileMenuOpen,
  onToggleProfileMenu,
  t,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  isProductAdmin = false,
  productAdminLabel,
  productAdminHref
}: MoreModulesSheetProps) {
  if (!isOpen) {
    return null;
  }

  const unreadLabel = unreadNotificationsCount > 99 ? "99+" : String(unreadNotificationsCount);
  const unreadMessagesLabel = unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount);

  return (
    <>
      <button type="button" className="loom-mobile-more-backdrop" aria-label={t("common.cancel", "Cancel")} onClick={onClose} />
      <aside className="loom-mobile-more-panel" aria-label={title}>
        <div className="loom-mobile-more-header">
          <div>
            <p className="loom-mobile-more-eyebrow">{t("nav.more", "More")}</p>
            <h2 className="loom-mobile-more-title">{title}</h2>
          </div>
          <button type="button" className="loom-mobile-header-action" aria-label={t("common.close", "Close")} onClick={onClose}>
            <span aria-hidden>&times;</span>
          </button>
        </div>

        <div className="loom-mobile-more-section">
          <button type="button" className="loom-profile-trigger" onClick={onToggleProfileMenu}>
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

        {sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <div key={section.title} className="loom-mobile-more-section">
              <p className="loom-nav-section-title">{section.title}</p>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={clsx("loom-mobile-more-link", isActive && "is-active")}>
                    <span className="loom-nav-dot">
                      <NavIcon name={item.icon} className="loom-nav-glyph" />
                    </span>
                    <span>{t(item.labelKey, item.fallbackLabel)}</span>
                    {item.href === "/notifications" && unreadNotificationsCount > 0 ? (
                      <span className="loom-nav-counter">{unreadLabel}</span>
                    ) : null}
                    {item.href === "/messages" && unreadMessagesCount > 0 ? (
                      <span className="loom-nav-counter">{unreadMessagesLabel}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}

        {isProductAdmin && productAdminHref && productAdminLabel ? (
          <div className="loom-mobile-more-section">
            <p className="loom-nav-section-title">{t("nav.productAdmin", "Product Admin")}</p>
            <Link href={productAdminHref} className={clsx("loom-mobile-more-link", pathname.startsWith(productAdminHref) && "is-active")}>
              <span className="loom-nav-dot">
                <NavIcon name="product_admin" className="loom-nav-glyph" />
              </span>
              <span>{productAdminLabel}</span>
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
