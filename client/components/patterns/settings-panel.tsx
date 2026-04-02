"use client";

import type { ReactNode } from "react";

export function SettingsPanel({
  title,
  description,
  children
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="loom-settings-panel">
      <div className="loom-settings-panel-header">
        <h3 className="loom-section-title m-0">{title}</h3>
        {description ? <p className="loom-muted small m-0">{description}</p> : null}
      </div>
      <div className="loom-settings-panel-body">{children}</div>
    </section>
  );
}

export function SettingsPanelSection({
  title,
  description,
  children
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="loom-settings-panel-section">
      <div className="loom-settings-panel-section-header">
        <h4 className="loom-settings-panel-section-title">{title}</h4>
        {description ? <p className="loom-muted small m-0">{description}</p> : null}
      </div>
      <div className="loom-settings-panel-section-body">{children}</div>
    </section>
  );
}

export function SettingsPanelActions({ children }: { children: ReactNode }) {
  return <div className="loom-settings-panel-actions">{children}</div>;
}
