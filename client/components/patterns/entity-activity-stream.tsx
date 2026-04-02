"use client";

import type { ReactNode } from "react";

export type EntityActivityEntry = {
  id: string;
  body: string;
  entryKind: "comment" | "audit";
  createdAt: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  metadata?: Record<string, unknown>;
};

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function renderActivityValue(value: unknown, dateLocale: string) {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime()) && /T/.test(value)) {
      return parsedDate.toLocaleString(dateLocale);
    }
    return value;
  }

  return String(value);
}

export function EntityActivityStream({
  entries,
  dateLocale,
  emptyState,
  loadingState,
  errorState,
  sortValue,
  onSortChange,
  composer,
  countLabel
}: {
  entries: EntityActivityEntry[];
  dateLocale: string;
  emptyState: ReactNode;
  loadingState?: ReactNode;
  errorState?: ReactNode;
  sortValue?: "oldest" | "newest";
  onSortChange?: (value: "oldest" | "newest") => void;
  composer?: ReactNode;
  countLabel?: ReactNode;
}) {
  const hasBlockingState = Boolean(loadingState) || Boolean(errorState);

  return (
    <>
      {sortValue && onSortChange ? (
        <div className="loom-row-between">
          <div className="loom-task-comment-sort-toggle" role="group" aria-label="Activity sort">
            <button type="button" className={sortValue === "oldest" ? "is-active" : ""} onClick={() => onSortChange("oldest")}>
              Oldest first
            </button>
            <button type="button" className={sortValue === "newest" ? "is-active" : ""} onClick={() => onSortChange("newest")}>
              Newest first
            </button>
          </div>
          {countLabel ? <div className="loom-inline-actions">{countLabel}</div> : null}
        </div>
      ) : null}

      <div className="loom-task-comments-list mt-3">
        {loadingState}
        {errorState}

        {entries.map((entry) => (
          <article key={entry.id} className={`loom-task-comment-item ${entry.entryKind === "audit" ? "is-audit" : ""}`.trim()}>
            {entry.entryKind === "audit" ? (
              <>
                <span className="loom-task-audit-marker" aria-hidden="true" />
                <div className="loom-task-comment-body loom-task-audit-body">
                  <p className="m-0 loom-task-comment-headline">
                    <span className="loom-task-audit-title">{entry.authorName}</span>
                    <span className="loom-muted small">{new Date(entry.createdAt).toLocaleString(dateLocale)}</span>
                  </p>
                  <p className="m-0 loom-task-audit-copy">{entry.body}</p>
                  <div className="loom-task-audit-delta">
                    <span className="loom-task-audit-field">{String(entry.metadata?.fieldLabel ?? "Updated")}</span>
                    <span className="loom-task-audit-value is-previous">{renderActivityValue(entry.metadata?.previousValue, dateLocale)}</span>
                    <span className="loom-task-audit-arrow" aria-hidden="true">-&gt;</span>
                    <span className="loom-task-audit-value is-next">{renderActivityValue(entry.metadata?.nextValue, dateLocale)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span
                  className={`loom-task-assignee-avatar ${entry.authorAvatarUrl ? "has-image" : ""}`}
                  style={entry.authorAvatarUrl ? { backgroundImage: `url("${entry.authorAvatarUrl}")` } : undefined}
                  aria-hidden="true"
                >
                  {entry.authorAvatarUrl ? null : getInitials(entry.authorName)}
                </span>
                <div className="loom-task-comment-body">
                  <p className="m-0 loom-task-comment-headline">
                    <span className="font-semibold">{entry.authorName}</span>
                    <span className="loom-muted small">{new Date(entry.createdAt).toLocaleString(dateLocale)}</span>
                  </p>
                  <p className="m-0 mt-2">{entry.body}</p>
                </div>
              </>
            )}
          </article>
        ))}

        {!hasBlockingState && entries.length === 0 ? emptyState : null}
      </div>

      {composer ? <div className="loom-task-comment-form mt-3">{composer}</div> : null}
    </>
  );
}
