"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const familySettingsSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

type FamilySettingsValues = z.infer<typeof familySettingsSchema>;

export function FamilySettingsForm({ familyId, defaultName }: { familyId: string; defaultName: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FamilySettingsValues>({
    resolver: zodResolver(familySettingsSchema),
    defaultValues: { name: defaultName }
  });

  async function onSubmit(values: FamilySettingsValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/families", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ familyId, ...values })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? "Failed to update family");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>Family name</span>
        <input className="loom-input" type="text" {...form.register("name")} />
        {form.formState.errors.name ? <p className="loom-feedback-error">{form.formState.errors.name.message}</p> : null}
      </label>

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save changes"}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
