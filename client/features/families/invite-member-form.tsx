"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["adult", "child", "admin"])
});

type InviteValues = z.infer<typeof inviteSchema>;

export function InviteMemberForm({ familyId }: { familyId: string }) {
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
      setServerError(payload?.error ?? "Failed to invite member");
      setIsLoading(false);
      return;
    }

    form.reset({ email: "", role: "adult" });
    setIsLoading(false);
    router.refresh();
  }

  return (
    <form className="loom-form-inline" onSubmit={form.handleSubmit(onSubmit)}>
      <input className="loom-input" type="email" placeholder="Email" {...form.register("email")} />
      <select className="loom-input" {...form.register("role")}>
        <option value="adult">Adult</option>
        <option value="child">Child</option>
        <option value="admin">Admin</option>
      </select>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Sending..." : "Invite"}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
