"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const noteFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1),
  category: z.string().trim().max(120).optional()
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

export function NoteForm({
  familyId,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  initialValues,
  disableRedirect = false,
  onSaved
}: {
  familyId: string;
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<NoteFormValues>;
  disableRedirect?: boolean;
  onSaved?: (payload: { noteId?: string }) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      content: initialValues?.content ?? "",
      category: initialValues?.category ?? ""
    }
  });

  async function onSubmit(values: NoteFormValues) {
    setServerError(null);
    setIsLoading(true);
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        content: values.content,
        category: values.category || null
      })
    });

    const payload = (await response.json().catch(() => null)) as { noteId?: string; error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("notes.saveError", "Failed to save note"));
      setIsLoading(false);
      return;
    }

    onSaved?.({ noteId: payload?.noteId });

    if (disableRedirect) {
      setIsLoading(false);
      return;
    }

    const next = payload?.noteId ? `/notes/${payload.noteId}` : redirectTo;
    router.push(next);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("common.title", "Title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>
      <label className="loom-field">
        <span>{t("common.category", "Category")}</span>
        <input className="loom-input" type="text" {...form.register("category")} />
      </label>
      <label className="loom-field">
        <span>{t("notes.content", "Content")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("content")} />
      </label>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
