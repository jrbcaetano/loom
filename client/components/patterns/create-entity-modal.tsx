"use client";

import type { ReactNode } from "react";
import { ResponsivePanel } from "@/components/common/responsive-panel";

type CreateEntityModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "default" | "wide";
  eyebrow?: string;
  subtitle?: ReactNode;
};

export function CreateEntityModal({
  isOpen,
  title,
  onClose,
  children,
  size = "wide",
  eyebrow,
  subtitle
}: CreateEntityModalProps) {
  return (
    <ResponsivePanel
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      variant="modal"
      size={size}
      titleContent={
        <div className="loom-entity-shell-heading">
          <div className="loom-entity-shell-heading-copy">
            {eyebrow ? <p className="loom-entity-shell-eyebrow">{eyebrow}</p> : null}
            <div className="loom-entity-shell-title-row">
              <h3 className="loom-section-title m-0">{title}</h3>
            </div>
            {subtitle ? <div className="loom-entity-shell-subtitle">{subtitle}</div> : null}
          </div>
        </div>
      }
    >
      <div className="loom-entity-shell-content loom-entity-shell-content-modal">{children}</div>
    </ResponsivePanel>
  );
}
