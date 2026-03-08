import { clsx } from "clsx";

type VisibilityBadgeProps = {
  visibility: "private" | "family" | "selected_members";
};

const labels: Record<VisibilityBadgeProps["visibility"], string> = {
  private: "Private",
  family: "Family",
  selected_members: "Selected"
};

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  return <span className={clsx("loom-badge", `is-${visibility}`)}>{labels[visibility]}</span>;
}
