"use client";

import type { ReactNode } from "react";
import { ResponsivePanel } from "@/components/common/responsive-panel";
import { EntitySummaryHeader } from "@/components/patterns/entity-summary-header";

type EntityDetailShellProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
  eyebrow?: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  titleNode?: ReactNode;
  headerActions?: ReactNode;
  summaryMeta?: ReactNode;
};

export function EntityDetailShell({
  isOpen,
  title,
  onClose,
  children,
  footer,
  size = "wide",
  eyebrow,
  subtitle,
  badge,
  titleNode,
  headerActions,
  summaryMeta
}: EntityDetailShellProps) {
  return (
    <ResponsivePanel
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      footer={footer}
      size={size}
      headerActions={headerActions}
      titleContent={
        <EntitySummaryHeader
          eyebrow={eyebrow}
          title={titleNode ?? title}
          badge={badge}
          subtitle={subtitle}
          meta={summaryMeta}
        />
      }
    >
      <div className="loom-entity-shell-content">{children}</div>
    </ResponsivePanel>
  );
}
