"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { getDisplayListTitle } from "@/features/lists/display";

type ListOverview = {
  id: string;
  title: string;
  visibility: "private" | "family" | "selected_members";
  description: string | null;
  isSystemShoppingList: boolean;
  updatedAt: string;
  totalItems: number;
  completedItems: number;
  remainingItems: number;
  participants: Array<{
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
  }>;
};

function getListIcon(title: string, isSystemShoppingList: boolean) {
  if (isSystemShoppingList) return "🛒";

  const value = title.toLowerCase();

  if (value.includes("hardware")) return "🔧";
  if (value.includes("travel") || value.includes("packing")) return "✈️";
  if (value.includes("gift")) return "🎁";
  if (value.includes("school")) return "🎓";
  return "📝";
}

function formatRelativeTime(value: string, t: (key: string) => string) {
  const now = Date.now();
  const target = new Date(value).getTime();
  const diffMs = Math.max(0, now - target);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return t("time.justNow");
  if (diffMinutes < 60) return `${diffMinutes} ${t("time.minAgo")}`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? t("time.hourAgo") : t("time.hoursAgo")}`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? t("time.dayAgo") : t("time.daysAgo")}`;
}

function getInitials(value: string | null) {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function ListsBoardClient({ lists, canCreate = true }: { lists: ListOverview[]; canCreate?: boolean }) {
  const { t } = useI18n();
  const activeLists = lists.filter((list) => !(list.totalItems > 0 && list.remainingItems === 0));
  const completedLists = lists.filter((list) => list.totalItems > 0 && list.remainingItems === 0);

  const totalActiveItems = lists.reduce((sum, list) => sum + list.remainingItems, 0);
  const totalCompletedLists = completedLists.length;
  const totalSharedLists = lists.filter((list) => list.visibility === "family" || list.isSystemShoppingList).length;

  return (
    <div className="loom-lists-overview">
      <section className="loom-lists-overview-stats">
        <article className="loom-lists-stat-card">
          <p className="loom-lists-stat-value">{totalActiveItems}</p>
          <p className="loom-lists-stat-label">{t("lists.activeItems")}</p>
        </article>
        <article className="loom-lists-stat-card">
          <p className="loom-lists-stat-value">{totalSharedLists}</p>
          <p className="loom-lists-stat-label">{t("lists.sharedLists")}</p>
        </article>
        <article className="loom-lists-stat-card">
          <p className="loom-lists-stat-value">{totalCompletedLists}</p>
          <p className="loom-lists-stat-label">{t("lists.completed")}</p>
        </article>
      </section>

      <section className="loom-stack-sm">
        <p className="loom-lists-section-title">{t("lists.activeLists")}</p>

        {activeLists.length === 0 ? <p className="loom-muted">{t("lists.noActiveLists")}</p> : null}
        {activeLists.map((list) => {
          const progress = list.totalItems === 0 ? 0 : Math.round((list.completedItems / list.totalItems) * 100);
          const displayTitle = getDisplayListTitle(list.title, list.isSystemShoppingList, t);

          return (
            <Link key={list.id} href={`/lists/${list.id}`} className="loom-lists-overview-card">
              <div className="loom-lists-card-grid">
                <div className="loom-lists-card-icon" aria-hidden>
                  {getListIcon(list.title, list.isSystemShoppingList)}
                </div>

                <div className="loom-lists-card-content">
                  <div className="loom-lists-card-head">
                    <h3 className="loom-lists-card-title">{displayTitle}</h3>
                    {list.isSystemShoppingList ? <span className="loom-lists-system-pill">{t("common.system")}</span> : null}
                  </div>

                  <div className="loom-lists-card-meta-row">
                    <span className={`loom-home-pill ${list.visibility === "family" || list.isSystemShoppingList ? "" : "is-muted"}`}>
                      {list.visibility === "family" || list.isSystemShoppingList ? t("common.shared") : t("visibility.private")}
                    </span>
                    <span className="loom-muted small">{formatRelativeTime(list.updatedAt, t)}</span>
                  </div>

                  <p className="loom-lists-card-remaining">{list.remainingItems} {t("lists.remaining")}</p>
                  <div className="loom-lists-progress-row">
                    <div className="loom-lists-progress-track">
                      <div className="loom-lists-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="loom-muted small">
                      {list.completedItems}/{list.totalItems}
                    </span>
                  </div>

                  <div className="loom-lists-participants">
                    {list.participants.length > 0 ? (
                      list.participants.map((participant) => (
                        <span
                          key={participant.userId}
                          className={`loom-lists-participant ${participant.avatarUrl ? "has-image" : ""}`}
                          style={participant.avatarUrl ? { backgroundImage: `url(${participant.avatarUrl})` } : undefined}
                          title={participant.fullName ?? t("common.member")}
                        >
                          {participant.avatarUrl ? null : getInitials(participant.fullName)}
                        </span>
                      ))
                    ) : (
                      <span className="loom-muted small">{t("lists.noContributors")}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {completedLists.length > 0 ? (
        <section className="loom-stack-sm">
          <p className="loom-lists-section-title">{t("lists.completed")}</p>
          {completedLists.map((list) => (
            <Link key={list.id} href={`/lists/${list.id}`} className="loom-lists-overview-card">
              <div className="loom-lists-card-grid">
                <div className="loom-lists-card-icon" aria-hidden>
                  {getListIcon(list.title, list.isSystemShoppingList)}
                </div>
                <div className="loom-lists-card-content">
                  <div className="loom-lists-card-head">
                    <h3 className="loom-lists-card-title">{getDisplayListTitle(list.title, list.isSystemShoppingList, t)}</h3>
                  </div>
                  <div className="loom-lists-card-meta-row">
                    <span className={`loom-home-pill ${list.visibility === "family" || list.isSystemShoppingList ? "" : "is-muted"}`}>
                      {list.visibility === "family" || list.isSystemShoppingList ? t("common.shared") : t("visibility.private")}
                    </span>
                    <span className="loom-muted small">{formatRelativeTime(list.updatedAt, t)}</span>
                  </div>
                  <p className="loom-lists-card-remaining">{t("lists.allComplete")}</p>
                  <div className="loom-lists-progress-row">
                    <div className="loom-lists-progress-track">
                      <div className="loom-lists-progress-fill" style={{ width: "100%" }} />
                    </div>
                    <span className="loom-muted small">
                      {list.completedItems}/{list.totalItems}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      {canCreate ? (
        <Link href="/lists/new" className="loom-lists-create-button">
          + {t("lists.createAction")}
        </Link>
      ) : null}
    </div>
  );
}
