"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { NavIcon } from "@/components/shell/nav-icon";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { BottomTabBar } from "@/components/shell/bottom-tab-bar";
import { MoreModulesSheet } from "@/components/shell/more-modules-sheet";
import { useI18n } from "@/lib/i18n/context";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  normalizeProductFeatureAvailability,
  type ProductFeatureAvailability
} from "@/lib/product-features";
import { LOOM_MODE_REGISTRY } from "@/features/navigation/mode-registry";

const productAdminNavItem = {
  href: "/admin",
  labelKey: "nav.productAdmin",
  icon: "product_admin"
} as const;

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

  const visibleModes = useMemo(
    () =>
      LOOM_MODE_REGISTRY.filter(
        (item) => !item.featureKey || normalizedFeatureAvailability[item.featureKey]
      ),
    [normalizedFeatureAvailability]
  );
  const visiblePrimaryNav = useMemo(
    () => visibleModes.filter((item) => item.placement === "primary"),
    [visibleModes]
  );
  const visibleMoreNav = useMemo(
    () => visibleModes.filter((item) => item.placement === "more"),
    [visibleModes]
  );
  const visibleSettingsNav = useMemo(
    () => visibleModes.filter((item) => item.placement === "settings"),
    [visibleModes]
  );
  const visibleMobileBottomNav = useMemo(
    () => visiblePrimaryNav.filter((item) => item.mobileTabEligible).slice(0, 4),
    [visiblePrimaryNav]
  );
  const isNotificationsEnabled = normalizedFeatureAvailability.notifications;
  const isMessagesEnabled = normalizedFeatureAvailability.messages;

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
        <div className="loom-family-context">
          <span className="loom-family-context-label">{t("settings.activeFamily", "Active family")}</span>
          <strong className="loom-family-context-name">{_activeFamilyName ?? t("family.none", "No family selected")}</strong>
        </div>

        <SidebarNav
          pathname={pathname}
          items={visiblePrimaryNav}
          title={t("common.viewAll", "Workspace")}
          t={t}
          unreadNotificationsCount={liveUnreadNotificationsCount}
          unreadMessagesCount={liveUnreadMessagesCount}
        />

        <SidebarNav
          pathname={pathname}
          items={visibleMoreNav}
          title={t("nav.more", "More")}
          t={t}
          unreadNotificationsCount={liveUnreadNotificationsCount}
          unreadMessagesCount={liveUnreadMessagesCount}
        />

        <SidebarNav pathname={pathname} items={visibleSettingsNav} title={t("nav.settings", "Settings")} t={t} />

        <div className="loom-sidebar-footer">
          {isProductAdmin ? (
            <Link
              href={productAdminNavItem.href}
              className={clsx("loom-nav-link mb-3", pathname.startsWith(productAdminNavItem.href) && "is-active")}
            >
              <span className="loom-nav-dot"><NavIcon name={productAdminNavItem.icon} className="loom-nav-glyph" /></span>
              {t(productAdminNavItem.labelKey, "Product Admin")}
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
              <div className="loom-mobile-brand-block">
                <Link href="/home" className="loom-mobile-brand">
                  <Image src="/brand/loom-symbol.png" alt="" width={30} height={30} className="loom-brand-badge" aria-hidden />
                  <span>Loom</span>
                </Link>
                <span className="loom-mobile-family-pill">{_activeFamilyName ?? t("family.none", "No family selected")}</span>
              </div>
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

      <BottomTabBar
        pathname={pathname}
        items={visibleMobileBottomNav}
        onMoreClick={() => setIsMobileMoreOpen(true)}
        moreLabel={t("nav.more", "More")}
        t={t}
      />

      <MoreModulesSheet
        pathname={pathname}
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        title={t("nav.more", "More")}
        sections={[
          { title: t("common.viewAll", "Workspace"), items: visiblePrimaryNav.filter((item) => !item.mobileTabEligible) },
          { title: t("nav.more", "More"), items: visibleMoreNav },
          { title: t("nav.settings", "Settings"), items: visibleSettingsNav }
        ]}
        profileName={profileName}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        initial={initial}
        isProfileMenuOpen={isProfileMenuOpen}
        onToggleProfileMenu={() => setIsProfileMenuOpen((value) => !value)}
        t={t}
        unreadNotificationsCount={liveUnreadNotificationsCount}
        unreadMessagesCount={liveUnreadMessagesCount}
        isProductAdmin={isProductAdmin}
        productAdminHref={productAdminNavItem.href}
        productAdminLabel={t(productAdminNavItem.labelKey, "Product Admin")}
      />
    </div>
  );
}
