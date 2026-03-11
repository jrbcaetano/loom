"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const externalCalendarSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  sourceUrl: z.string().trim().url().max(2000),
  isEnabled: z.boolean()
});

const familySettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  externalCalendars: z.array(externalCalendarSchema).max(20)
});

type FamilySettingsValues = z.infer<typeof familySettingsSchema>;

type FamilySettingsFormProps = {
  familyId: string;
  defaultName: string;
  defaultExternalCalendars: Array<{
    id: string;
    displayName: string | null;
    sourceUrl: string;
    isEnabled: boolean;
  }>;
};

export function FamilySettingsForm({ familyId, defaultName, defaultExternalCalendars }: FamilySettingsFormProps) {
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FamilySettingsValues>({
    resolver: zodResolver(familySettingsSchema),
    defaultValues: {
      name: defaultName,
      externalCalendars: defaultExternalCalendars.map((entry) => ({
        displayName: entry.displayName ?? "",
        sourceUrl: entry.sourceUrl,
        isEnabled: entry.isEnabled
      }))
    }
  });

  const externalCalendarsFieldArray = useFieldArray({
    control: form.control,
    name: "externalCalendars"
  });

  async function onSubmit(values: FamilySettingsValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/families", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        name: values.name,
        externalCalendars: values.externalCalendars.map((entry) => ({
          displayName: entry.displayName?.trim() || null,
          sourceUrl: entry.sourceUrl.trim(),
          isEnabled: entry.isEnabled
        }))
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("family.updateError", "Failed to update family"));
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("family.name", "Family name")}</span>
        <input className="loom-input" type="text" {...form.register("name")} />
        {form.formState.errors.name ? <p className="loom-feedback-error">{form.formState.errors.name.message}</p> : null}
      </label>

      <div className="loom-stack-sm">
        <div className="loom-row-between">
          <p className="m-0 font-semibold">{t("family.externalCalendarsTitle", "External calendars")}</p>
          <button
            type="button"
            className="loom-button-ghost"
            onClick={() => externalCalendarsFieldArray.append({ displayName: "", sourceUrl: "", isEnabled: true })}
          >
            + {t("family.addExternalCalendar", "Add calendar")}
          </button>
        </div>
        <p className="loom-muted m-0 small">
          {t("family.externalCalendarsHint", "Add public iCal URLs or Google Calendar embed links. These events appear read-only in Calendar.")}
        </p>

        {externalCalendarsFieldArray.fields.map((field, index) => (
          <div key={field.id} className="loom-soft-row">
            <div className="loom-grid-2">
              <label className="loom-field">
                <span>{t("family.externalCalendarName", "Display name")}</span>
                <input className="loom-input" type="text" {...form.register(`externalCalendars.${index}.displayName`)} />
              </label>
              <label className="loom-field">
                <span>{t("family.externalCalendarUrl", "Calendar URL")}</span>
                <input className="loom-input" type="url" {...form.register(`externalCalendars.${index}.sourceUrl`)} />
                {form.formState.errors.externalCalendars?.[index]?.sourceUrl ? (
                  <p className="loom-feedback-error">{form.formState.errors.externalCalendars[index]?.sourceUrl?.message}</p>
                ) : null}
              </label>
            </div>

            <div className="loom-row-between mt-3">
              <label className="loom-checkbox-row">
                <input type="checkbox" {...form.register(`externalCalendars.${index}.isEnabled`)} />
                <span>{t("common.available", "Available")}</span>
              </label>
              <button type="button" className="loom-button-ghost" onClick={() => externalCalendarsFieldArray.remove(index)}>
                {t("common.remove", "Remove")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : t("common.saveChanges", "Save changes")}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
