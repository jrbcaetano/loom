"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const documentFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(3000).optional(),
  category: z.string().trim().max(120).optional(),
  fileUrl: z.string().trim().url().or(z.literal("")).optional()
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

export function DocumentForm({
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
  initialValues?: Partial<DocumentFormValues>;
  disableRedirect?: boolean;
  onSaved?: (payload: { documentId?: string }) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      category: initialValues?.category ?? "",
      fileUrl: initialValues?.fileUrl ?? ""
    }
  });

  async function onSubmit(values: DocumentFormValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        description: values.description || null,
        category: values.category || null,
        fileUrl: values.fileUrl || null
      })
    });

    const payload = (await response.json().catch(() => null)) as { documentId?: string; error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("documents.saveError", "Failed to save document"));
      setIsLoading(false);
      return;
    }

    onSaved?.({ documentId: payload?.documentId });

    if (disableRedirect) {
      setIsLoading(false);
      return;
    }

    const next = payload?.documentId ? `/documents/${payload.documentId}` : redirectTo;
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
        <span>{t("common.description", "Description")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>
      <label className="loom-field">
        <span>{t("documents.fileUrlOptional", "File URL (optional)")}</span>
        <input className="loom-input" type="url" {...form.register("fileUrl")} />
      </label>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}

