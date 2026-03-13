"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { FamilyMember } from "@/features/families/server";

export function FamilyMembersList({ familyId, members }: { familyId: string; members: FamilyMember[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onRemoveInvite(memberId: string) {
    setServerError(null);
    setPendingMemberId(memberId);

    const response = await fetch(`/api/families/invite/${memberId}?familyId=${encodeURIComponent(familyId)}`, {
      method: "DELETE"
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("family.removeInviteError", "Failed to remove invite"));
      setPendingMemberId(null);
      return;
    }

    setPendingMemberId(null);
    router.refresh();
  }

  return (
    <div className="loom-stack-sm mt-3">
      {members.map((member) => {
        const isPendingInvite = member.status === "invited" && !member.userId;
        return (
          <article key={member.id} className="loom-row-between border-b border-slate-100 pb-3">
            <div>
              <p className="m-0 font-semibold">{member.fullName ?? member.email ?? t("family.pendingInvite", "Pending invite")}</p>
              <p className="loom-muted small mt-1">{member.status}</p>
            </div>
            <div className="loom-stack-sm">
              <p className="loom-muted small m-0">{member.role}</p>
              {isPendingInvite ? (
                <button
                  type="button"
                  className="loom-button-ghost"
                  disabled={pendingMemberId === member.id}
                  onClick={() => void onRemoveInvite(member.id)}
                >
                  {pendingMemberId === member.id ? t("common.deleting", "Deleting...") : t("common.remove", "Remove")}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </div>
  );
}
