"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["adult", "child", "admin"])
});

type InviteValues = z.infer<typeof inviteSchema>;

export function InviteMemberForm({
  familyId,
  onSaved
}: {
  familyId: string;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "adult" }
  });

  async function onSubmit(values: InviteValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/families/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ familyId, ...values })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("family.inviteError", "Failed to invite member"));
      setIsLoading(false);
      return;
    }

    form.reset({ email: "", role: "adult" });
    setIsLoading(false);
    router.refresh();
    onSaved?.();
  }

  return (
    <form className="loom-form-inline" onSubmit={form.handleSubmit(onSubmit)}>
      <input className="loom-input" type="email" placeholder={t("auth.email", "Email")} {...form.register("email")} />
      <select className="loom-input" {...form.register("role")}>
        <option value="adult">{t("family.roleAdult", "Adult")}</option>
        <option value="child">{t("family.roleChild", "Child")}</option>
        <option value="admin">{t("family.roleAdmin", "Admin")}</option>
      </select>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.sending", "Sending...") : t("family.invite", "Invite")}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
