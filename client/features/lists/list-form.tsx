"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";
import { SYSTEM_SHOPPING_LIST_TITLE } from "@/features/lists/display";

const listSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  visibility: z.enum(["private", "family", "selected_members"]),
  categoriesText: z.string().trim().max(3000).optional()
});

type ListValues = z.infer<typeof listSchema>;

type MemberOption = {
  userId: string;
  displayName: string;
};

function parseCategoriesInput(value: string) {
  const rows = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const categories = new Map<
    string,
    {
      value: string;
      translations: Record<string, string>;
    }
  >();

  for (const row of rows) {
    const [rawValue, ...translationSegments] = row.split("|").map((segment) => segment.trim());
    if (!rawValue) continue;

    const key = rawValue.toLowerCase();
    const current = categories.get(key) ?? { value: rawValue, translations: {} };

    for (const segment of translationSegments) {
      const [locale, label] = segment.split("=").map((part) => part.trim());
      if (!locale || !label) continue;
      current.translations[locale] = label;
    }

    categories.set(key, current);
  }

  return Array.from(categories.values());
}

export function ListForm({
  familyId,
  members,
  redirectTo,
  submitLabel,
  endpoint,
  method,
  initialValues,
  cancelHref,
  lockSystemFields = false
}: {
  familyId: string;
  members: MemberOption[];
  redirectTo: string;
  submitLabel: string;
  endpoint: string;
  method: "POST" | "PATCH";
  initialValues?: Partial<ListValues>;
  cancelHref?: string;
  lockSystemFields?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ListValues>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      title: lockSystemFields ? t("home.shoppingList", SYSTEM_SHOPPING_LIST_TITLE) : (initialValues?.title ?? ""),
      description: initialValues?.description ?? "",
      visibility: initialValues?.visibility ?? "family",
      categoriesText: initialValues?.categoriesText ?? ""
    }
  });

  const visibility = form.watch("visibility");

  async function onSubmit(values: ListValues) {
    setServerError(null);
    setIsLoading(true);

    const categories = values.categoriesText
      ? parseCategoriesInput(values.categoriesText)
      : [];

    const effectiveTitle = lockSystemFields ? SYSTEM_SHOPPING_LIST_TITLE : values.title;
    const effectiveVisibility = lockSystemFields ? "family" : values.visibility;

    const selectedMemberIds =
      !lockSystemFields && visibility === "selected_members"
        ? Array.from(document.querySelectorAll<HTMLInputElement>('input[name="selectedMembers"]:checked')).map((input) => input.value)
        : [];

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: effectiveTitle,
        description: values.description,
        visibility: effectiveVisibility,
        categories,
        selectedMemberIds
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; listId?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("lists.saveError"));
      setIsLoading(false);
      return;
    }

    const destination = payload?.listId ? `/lists/${payload.listId}` : redirectTo;
    router.push(destination);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("lists.form.title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} disabled={lockSystemFields} />
      </label>

      <label className="loom-field">
        <span>{t("lists.form.description")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>

      <label className="loom-field">
        <span>{t("lists.form.visibility")}</span>
        <select className="loom-input" {...form.register("visibility")} disabled={lockSystemFields}>
          <option value="private">{t("visibility.private")}</option>
          <option value="family">{t("visibility.family")}</option>
          <option value="selected_members">{t("visibility.selected_members")}</option>
        </select>
      </label>

      <label className="loom-field">
        <span>{t("lists.form.categories")}</span>
        <textarea
          className="loom-input loom-textarea"
          placeholder={t("lists.form.categoriesPlaceholder")}
          {...form.register("categoriesText")}
        />
        <small className="loom-muted">{t("lists.form.categoriesHint")}</small>
      </label>

      {lockSystemFields ? <p className="loom-muted small m-0">{t("lists.form.systemNotice")}</p> : null}

      {visibility === "selected_members" && !lockSystemFields ? (
        <div className="loom-card soft p-4">
          <p className="m-0 font-semibold">{t("lists.form.selectedMembers")}</p>
          <div className="loom-stack-sm mt-3">
            {members.map((member) => (
              <label key={member.userId} className="loom-checkbox-row">
                <input type="checkbox" value={member.userId} name="selectedMembers" />
                <span>{member.displayName}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="loom-form-actions">
        {cancelHref ? (
          <Link href={cancelHref} className="loom-button-ghost">
            {t("common.cancel")}
          </Link>
        ) : null}
        <button className="loom-button-primary" type="submit" disabled={isLoading}>
          {isLoading ? t("common.saving") : submitLabel}
        </button>
      </div>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
