"use client";

import type { ReactNode } from "react";

export function EntitySection({
  title,
  description,
  actions,
  children
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="loom-entity-section">
      <div className="loom-row-between">
        <div>
          <h4 className="loom-section-title m-0">{title}</h4>
          {description ? <div className="loom-entity-section-description">{description}</div> : null}
        </div>
        {actions ? <div className="loom-inline-actions">{actions}</div> : null}
      </div>
      <div className="loom-entity-section-body">{children}</div>
    </section>
  );
}

export function EntityMetadataGrid({ children }: { children: ReactNode }) {
  return <div className="loom-entity-metadata-grid">{children}</div>;
}

export function EntityMetadataItem({
  label,
  value,
  emphasized = false
}: {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <article className={`loom-entity-metadata-item ${emphasized ? "is-emphasized" : ""}`.trim()}>
      <p className="loom-entity-metadata-label">{label}</p>
      <div className="loom-entity-metadata-value">{value}</div>
    </article>
  );
}

export function EntityVisibilityBadge({
  visibility,
  labels
}: {
  visibility: "private" | "family" | "selected_members";
  labels?: Partial<Record<"private" | "family" | "selected_members", string>>;
}) {
  const text =
    labels?.[visibility] ??
    (visibility === "private" ? "Private" : visibility === "family" ? "Family" : "Selected members");

  return <span className={`loom-home-pill loom-entity-visibility-pill is-${visibility}`.trim()}>{text}</span>;
}

export function EntityAssigneeBadge({
  label,
  value
}: {
  label?: string;
  value: ReactNode;
}) {
  return (
    <div className="loom-entity-assignee-badge">
      {label ? <span className="loom-entity-assignee-label">{label}</span> : null}
      <span>{value}</span>
    </div>
  );
}

export function EntitySummaryMeta({ children }: { children: ReactNode }) {
  return <div className="loom-entity-summary-meta">{children}</div>;
}

export function EntitySummaryMetaItem({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <span className="loom-entity-summary-meta-item">
      <span className="loom-entity-summary-meta-label">{label}</span>
      <span className="loom-entity-summary-meta-value">{value}</span>
    </span>
  );
}

