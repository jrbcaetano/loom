"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(120)
});

type CreateFamilyValues = z.infer<typeof createFamilySchema>;

export function CreateFamilyForm() {
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateFamilyValues>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { name: "" }
  });

  async function onSubmit(values: CreateFamilyValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/families", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("family.createError", "Failed to create family"));
      setIsLoading(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("family.name", "Family name")}</span>
        <input type="text" className="loom-input" {...form.register("name")} />
        {form.formState.errors.name ? <p className="loom-feedback-error">{form.formState.errors.name.message}</p> : null}
      </label>

      <div className="loom-inline-actions">
        {[t("family.suggestionHome", "Home"), t("family.suggestionFamily", "Family"), t("family.suggestionCrew", "Our Crew"), t("family.suggestionTeamHome", "Team Home")].map((suggestion) => (
          <button key={suggestion} type="button" className="loom-button-ghost" onClick={() => form.setValue("name", suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("family.creating", "Creating...") : t("family.create", "Create family")}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
