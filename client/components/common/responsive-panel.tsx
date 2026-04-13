"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
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
  status?: ReactNode;
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
  status,
  variant = "drawer"
}: ResponsivePanelProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`loom-panel-overlay ${variant === "modal" ? "is-modal" : ""}`.trim()} role="presentation">
      <button type="button" className="loom-panel-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside
        ref={panelRef}
        className={`loom-panel-shell ${size === "wide" ? "is-wide" : ""} ${variant === "modal" ? "is-modal" : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="loom-panel-header">
          <div className="loom-panel-title-slot" id={titleId}>
            {titleContent ?? <h3 className="loom-section-title m-0">{title}</h3>}
          </div>
          <div className="loom-panel-header-actions">
            {status ? (
              <div className="loom-panel-status" aria-live="polite">
                {status}
              </div>
            ) : null}
            {headerActions}
            <button type="button" className="loom-task-icon-button loom-panel-close-button" aria-label={t("common.close", "Close")} onClick={onClose}>
              ×
            </button>
          </div>
        </header>
        <div className="loom-panel-content">{children}</div>
        {footer ? <div className="loom-panel-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
