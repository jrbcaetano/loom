"use client";

import { type ReactNode, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";

type ResponsivePanelProps = {
  isOpen: boolean;
  title: string;
  titleContent?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
  headerActions?: ReactNode;
  variant?: "drawer" | "modal";
};

export function ResponsivePanel({
  isOpen,
  title,
  titleContent,
  onClose,
  children,
  footer,
  size = "default",
  headerActions,
  variant = "drawer"
}: ResponsivePanelProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`loom-panel-overlay ${variant === "modal" ? "is-modal" : ""}`.trim()} role="presentation">
      <button type="button" className="loom-panel-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside className={`loom-panel-shell ${size === "wide" ? "is-wide" : ""} ${variant === "modal" ? "is-modal" : ""}`.trim()} role="dialog" aria-modal="true" aria-label={title}>
        <header className="loom-panel-header">
          <div className="loom-panel-title-slot">{titleContent ?? <h3 className="loom-section-title m-0">{title}</h3>}</div>
          {headerActions ?? (
            <button type="button" className="loom-button-ghost" onClick={onClose}>
              {t("common.close", "Close")}
            </button>
          )}
        </header>
        <div className="loom-panel-content">{children}</div>
        {footer ? <div className="loom-panel-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
