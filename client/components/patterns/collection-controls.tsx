"use client";

import type { ReactNode } from "react";

export function CollectionControls({ children }: { children: ReactNode }) {
  return (
    <section className="loom-card loom-filter-card">
      <div className="loom-filter-row">{children}</div>
    </section>
  );
}

export function CollectionControlField({ children }: { children: ReactNode }) {
  return <label className="loom-field">{children}</label>;
}

export function CollectionControlAction({ children }: { children: ReactNode }) {
  return <div className="loom-field loom-collection-control-action">{children}</div>;
}

export function CollectionControlsFooter({ children }: { children: ReactNode }) {
  return <div className="loom-collection-controls-footer">{children}</div>;
}
