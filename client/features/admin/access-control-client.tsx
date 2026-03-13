"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";
import type { AccessInvite } from "@/features/admin/types";

const createInviteSchema = z.object({
  email: z.string().email(),
  expiresAtLocal: z.string().optional(),
  isActive: z.boolean().optional()
});

type CreateInviteValues = z.infer<typeof createInviteSchema>;

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString();
}

function mapStatusLabel(status: AccessInvite["status"]) {
  if (status === "pending") {
    return "Pending";
  }

  if (status === "accepted") {
    return "Accepted";
  }

  return "Revoked";
}

function mapSourceLabel(sourceType: AccessInvite["sourceType"], t: (key: string, fallback?: string) => string) {
  if (sourceType === "family_invite") {
    return t("admin.access.sourceFamilyInvite", "Family invite");
  }

  if (sourceType === "self_registration") {
    return t("admin.access.sourceSelfRegistration", "Web app self registration");
  }

  return t("admin.access.sourceProductAdmin", "Product admin");
}

function isInviteExpired(invite: AccessInvite) {
  if (!invite.expiresAt || invite.status !== "pending") {
    return false;
  }

  const expiresAt = new Date(invite.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return expiresAt < Date.now();
}

export function AccessControlClient() {
  const { t } = useI18n();
  const [invites, setInvites] = useState<AccessInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [pendingActivationId, setPendingActivationId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateInviteValues>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: "",
      expiresAtLocal: "",
      isActive: true
    }
  });

  async function loadInvites() {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/admin/access-invites", {
      cache: "no-store"
    });
    const payload = (await response.json().catch(() => null)) as { invites?: AccessInvite[]; error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.access.loadError", "Failed to load access invites"));
      setIsLoading(false);
      return;
    }

    setInvites(payload?.invites ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: CreateInviteValues) {
    setServerError(null);
    setIsSubmitting(true);

    const expiresAt = values.expiresAtLocal ? new Date(values.expiresAtLocal).toISOString() : null;
    const response = await fetch("/api/admin/access-invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        expiresAt,
        isActive: values.isActive ?? true
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.access.createError", "Failed to create access invite"));
      setIsSubmitting(false);
      return;
    }

    form.reset({ email: "", expiresAtLocal: "", isActive: true });
    setIsSubmitting(false);
    await loadInvites();
  }

  async function onRevoke(inviteId: string) {
    setServerError(null);
    setPendingRevokeId(inviteId);

    const response = await fetch(`/api/admin/access-invites/${inviteId}/revoke`, {
      method: "POST"
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.access.revokeError", "Failed to revoke invite"));
      setPendingRevokeId(null);
      return;
    }

    setPendingRevokeId(null);
    await loadInvites();
  }

  async function onToggleActive(inviteId: string, isActive: boolean) {
    setServerError(null);
    setPendingActivationId(inviteId);

    const response = await fetch(`/api/admin/access-invites/${inviteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.access.updateError", "Failed to update invite"));
      setPendingActivationId(null);
      return;
    }

    setPendingActivationId(null);
    await loadInvites();
  }

  async function onDeleteInvite(inviteId: string) {
    setServerError(null);
    setPendingDeleteId(inviteId);

    const response = await fetch(`/api/admin/access-invites/${inviteId}`, {
      method: "DELETE"
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.access.deleteError", "Failed to delete invite"));
      setPendingDeleteId(null);
      return;
    }

    setPendingDeleteId(null);
    await loadInvites();
  }

  return (
    <div className="loom-stack-md">
      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("admin.access.createTitle", "Create access invite")}</h2>
        <p className="loom-muted mt-1">
          {t(
            "admin.access.createSubtitle",
            "Access requests are tracked here. Users can enter the app only when access is active."
          )}
        </p>
        <form className="loom-form-inline mt-4" onSubmit={form.handleSubmit(onSubmit)}>
          <input
            className="loom-input"
            type="email"
            placeholder={t("auth.email", "Email")}
            {...form.register("email")}
          />
          <input
            className="loom-input"
            type="datetime-local"
            aria-label={t("admin.access.expiresAt", "Expires at")}
            {...form.register("expiresAtLocal")}
          />
          <label className="loom-check">
            <input type="checkbox" {...form.register("isActive")} />
            <span>{t("admin.access.activateNow", "Activate now")}</span>
          </label>
          <button className="loom-button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.sending", "Sending...") : t("admin.access.inviteAction", "Invite")}
          </button>
        </form>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("admin.access.invitesTitle", "Access invites")}</h2>
        {isLoading ? <p className="loom-muted mt-3">{t("common.loading", "Loading...")}</p> : null}
        {!isLoading && invites.length === 0 ? (
          <p className="loom-muted mt-3">{t("admin.access.empty", "No access invites yet.")}</p>
        ) : null}

        {!isLoading && invites.length > 0 ? (
          <div className="loom-stack-sm mt-3">
            {invites.map((invite) => (
              <article key={invite.id} className="loom-row-between border-b border-slate-100 pb-3">
                <div>
                  <p className="m-0 font-semibold">{invite.email}</p>
                  <p className="loom-muted small mt-1">
                    {t("admin.access.status", "Status")}: {mapStatusLabel(invite.status)}
                  </p>
                  <p className="loom-muted small">
                    {t("admin.access.active", "Active")}: {invite.isActive ? t("common.yes", "Yes") : t("common.no", "No")}
                  </p>
                  <p className="loom-muted small">
                    {t("admin.access.source", "Source")}: {mapSourceLabel(invite.sourceType, t)}
                    {invite.sourceFamilyName ? ` (${invite.sourceFamilyName})` : ""}
                  </p>
                  <p className={isInviteExpired(invite) ? "loom-feedback-error small" : "loom-muted small"}>
                    {t("admin.access.expiresAt", "Expires at")}: {formatDate(invite.expiresAt)}
                  </p>
                  <p className="loom-muted small">
                    {t("admin.access.activatedAt", "Activated at")}: {formatDate(invite.activatedAt)}
                  </p>
                  <p className="loom-muted small">
                    {t("admin.access.acceptedAt", "Accepted at")}: {formatDate(invite.acceptedAt)}
                  </p>
                </div>
                <div className="loom-stack-sm">
                  <p className="loom-muted small m-0">
                    {t("admin.access.invitedBy", "Invited by")}: {invite.invitedByLabel ?? "N/A"}
                  </p>
                  <p className="loom-muted small m-0">
                    {t("admin.access.acceptedBy", "Accepted by")}: {invite.acceptedByLabel ?? "N/A"}
                  </p>
                  <p className="loom-muted small m-0">
                    {t("admin.access.activatedBy", "Activated by")}: {invite.activatedByLabel ?? "N/A"}
                  </p>
                  <p className="loom-muted small m-0">
                    {t("admin.access.sourceCreatedBy", "Source created by")}: {invite.sourceCreatedByLabel ?? "N/A"}
                  </p>
                  <button
                    type="button"
                    className="loom-button-ghost"
                    disabled={pendingActivationId === invite.id}
                    onClick={() => void onToggleActive(invite.id, !invite.isActive)}
                  >
                    {pendingActivationId === invite.id
                      ? t("admin.access.updating", "Updating...")
                      : invite.isActive
                        ? t("admin.access.deactivateAction", "Deactivate")
                        : t("admin.access.activateAction", "Activate")}
                  </button>
                  <button
                    type="button"
                    className="loom-button-ghost"
                    disabled={invite.status !== "pending" || pendingRevokeId === invite.id}
                    onClick={() => void onRevoke(invite.id)}
                  >
                    {pendingRevokeId === invite.id
                      ? t("admin.access.revoking", "Revoking...")
                      : t("admin.access.revokeAction", "Revoke")}
                  </button>
                  <button
                    type="button"
                    className="loom-button-ghost"
                    disabled={pendingDeleteId === invite.id}
                    onClick={() => void onDeleteInvite(invite.id)}
                  >
                    {pendingDeleteId === invite.id
                      ? t("common.deleting", "Deleting...")
                      : t("common.remove", "Remove")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </div>
  );
}
