"use client";

import type { ReactNode } from "react";

export function EntitySummaryHeader({
  eyebrow,
  title,
  badge,
  subtitle,
  meta
}: {
  eyebrow?: string;
  title: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="loom-entity-shell-heading">
      <div className="loom-entity-shell-heading-copy">
        {eyebrow ? <p className="loom-entity-shell-eyebrow">{eyebrow}</p> : null}
        <div className="loom-entity-shell-title-row">
          {typeof title === "string" ? <h3 className="loom-section-title m-0">{title}</h3> : title}
          {badge ? <div className="loom-entity-shell-badge">{badge}</div> : null}
        </div>
        {subtitle ? <div className="loom-entity-shell-subtitle">{subtitle}</div> : null}
        {meta ? <div className="loom-entity-shell-summary-meta">{meta}</div> : null}
      </div>
    </div>
  );
}
