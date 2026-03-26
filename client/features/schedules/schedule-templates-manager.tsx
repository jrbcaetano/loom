"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { ScheduleCategory, ScheduleTemplateRow } from "@/features/schedules/model";

type TemplateDraft = {
  title: string;
  category: ScheduleCategory;
  location: string;
  startsAtLocal: string;
  endsAtLocal: string;
  spansNextDay: boolean;
  notes: string;
};

function emptyDraft(): TemplateDraft {
  return {
    title: "",
    category: "custom",
    location: "",
    startsAtLocal: "09:00",
    endsAtLocal: "17:00",
    spansNextDay: false,
    notes: ""
  };
}

export function ScheduleTemplatesManager({
  familyId,
  initialTemplates
}: {
  familyId: string;
  initialTemplates: ScheduleTemplateRow[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [templates, setTemplates] = useState(initialTemplates);
  const [createDraft, setCreateDraft] = useState<TemplateDraft>(emptyDraft());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  const categoryOptions: Array<{ value: ScheduleCategory; label: string }> = [
    { value: "work", label: t("schedules.categoryWork", "Work") },
    { value: "school", label: t("schedules.categorySchool", "School") },
    { value: "sport", label: t("schedules.categorySport", "Sport") },
    { value: "custom", label: t("schedules.categoryCustom", "Custom") }
  ];

  async function saveTemplate(templateId: string | null, draft: TemplateDraft) {
    setErrorText(null);
    setSavingId(templateId ?? "new");

    const response = await fetch(templateId ? `/api/schedule-templates/${templateId}` : "/api/schedule-templates", {
      method: templateId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: draft.title,
        category: draft.category,
        location: draft.location || null,
        startsAtLocal: `${draft.startsAtLocal}:00`,
        endsAtLocal: `${draft.endsAtLocal}:00`,
        spansNextDay: draft.spansNextDay,
        notes: draft.notes || null
      })
    });

    const payload = (await response.json().catch(() => null)) as { templateId?: string; error?: string } | null;
    if (!response.ok) {
      setErrorText(payload?.error ?? t("schedules.templateSaveError", "Failed to save schedule template"));
      setSavingId(null);
      return;
    }

    router.refresh();
    if (!templateId) {
      setCreateDraft(emptyDraft());
    }
    setSavingId(null);
  }

  async function deleteTemplate(templateId: string) {
    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) {
      return;
    }

    setErrorText(null);
    setSavingId(templateId);
    const response = await fetch(`/api/schedule-templates/${templateId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setErrorText(payload?.error ?? t("schedules.templateDeleteError", "Failed to delete schedule template"));
      setSavingId(null);
      return;
    }

    setTemplates((current) => current.filter((template) => template.id !== templateId));
    router.refresh();
    setSavingId(null);
  }

  return (
    <div className="loom-stack-sm">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          categoryOptions={categoryOptions}
          isSaving={savingId === template.id}
          onDelete={() => deleteTemplate(template.id)}
          onSave={(draft) => saveTemplate(template.id, draft)}
        />
      ))}

      <article className="loom-card p-4">
        <h3 className="loom-section-title">{t("schedules.newTemplate", "New template")}</h3>
        <div className="loom-form-inline mt-3">
          <label className="loom-field">
            <span>{t("common.title", "Title")}</span>
            <input className="loom-input" value={createDraft.title} onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="loom-field">
            <span>{t("schedules.category", "Category")}</span>
            <select className="loom-input" value={createDraft.category} onChange={(event) => setCreateDraft((current) => ({ ...current, category: event.target.value as ScheduleCategory }))}>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="loom-form-inline">
          <label className="loom-field">
            <span>{t("common.location", "Location")}</span>
            <input className="loom-input" value={createDraft.location} onChange={(event) => setCreateDraft((current) => ({ ...current, location: event.target.value }))} />
          </label>
          <label className="loom-field">
            <span>{t("schedules.startsAt", "Starts at")}</span>
            <input className="loom-input" type="time" value={createDraft.startsAtLocal} onChange={(event) => setCreateDraft((current) => ({ ...current, startsAtLocal: event.target.value }))} />
          </label>
          <label className="loom-field">
            <span>{t("schedules.endsAt", "Ends at")}</span>
            <input className="loom-input" type="time" value={createDraft.endsAtLocal} onChange={(event) => setCreateDraft((current) => ({ ...current, endsAtLocal: event.target.value }))} />
          </label>
        </div>
        <label className="loom-checkbox">
          <input type="checkbox" checked={createDraft.spansNextDay} onChange={(event) => setCreateDraft((current) => ({ ...current, spansNextDay: event.target.checked }))} />
          <span>{t("schedules.crossesMidnight", "Ends on the next day")}</span>
        </label>
        <label className="loom-field">
          <span>{t("common.notes", "Notes")}</span>
          <textarea className="loom-input" rows={2} value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        <button type="button" className="loom-button-primary" onClick={() => saveTemplate(null, createDraft)} disabled={savingId === "new"}>
          {savingId === "new" ? t("common.saving", "Saving...") : t("common.create", "Create")}
        </button>
      </article>

      {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
    </div>
  );
}

function TemplateCard({
  template,
  categoryOptions,
  isSaving,
  onSave,
  onDelete
}: {
  template: ScheduleTemplateRow;
  categoryOptions: Array<{ value: ScheduleCategory; label: string }>;
  isSaving: boolean;
  onSave: (draft: TemplateDraft) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [localDraft, setLocalDraft] = useState<TemplateDraft>({
    title: template.title,
    category: template.category,
    location: template.location ?? "",
    startsAtLocal: template.startsAtLocal.slice(0, 5),
    endsAtLocal: template.endsAtLocal.slice(0, 5),
    spansNextDay: template.spansNextDay,
    notes: template.notes ?? ""
  });

  return (
    <article className="loom-card p-4">
      <div className="loom-row-between">
        <strong>{template.title}</strong>
        <button type="button" className="loom-button-ghost" onClick={onDelete} disabled={isSaving}>
          {isSaving ? t("common.deleting", "Deleting...") : t("common.remove", "Remove")}
        </button>
      </div>
      <div className="loom-form-inline mt-3">
        <label className="loom-field">
          <span>{t("common.title", "Title")}</span>
          <input className="loom-input" value={localDraft.title} onChange={(event) => setLocalDraft((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label className="loom-field">
          <span>{t("schedules.category", "Category")}</span>
          <select className="loom-input" value={localDraft.category} onChange={(event) => setLocalDraft((current) => ({ ...current, category: event.target.value as ScheduleCategory }))}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("common.location", "Location")}</span>
          <input className="loom-input" value={localDraft.location} onChange={(event) => setLocalDraft((current) => ({ ...current, location: event.target.value }))} />
        </label>
        <label className="loom-field">
          <span>{t("schedules.startsAt", "Starts at")}</span>
          <input className="loom-input" type="time" value={localDraft.startsAtLocal} onChange={(event) => setLocalDraft((current) => ({ ...current, startsAtLocal: event.target.value }))} />
        </label>
        <label className="loom-field">
          <span>{t("schedules.endsAt", "Ends at")}</span>
          <input className="loom-input" type="time" value={localDraft.endsAtLocal} onChange={(event) => setLocalDraft((current) => ({ ...current, endsAtLocal: event.target.value }))} />
        </label>
      </div>
      <label className="loom-checkbox">
        <input type="checkbox" checked={localDraft.spansNextDay} onChange={(event) => setLocalDraft((current) => ({ ...current, spansNextDay: event.target.checked }))} />
        <span>{t("schedules.crossesMidnight", "Ends on the next day")}</span>
      </label>
      <label className="loom-field">
        <span>{t("common.notes", "Notes")}</span>
        <textarea className="loom-input" rows={2} value={localDraft.notes} onChange={(event) => setLocalDraft((current) => ({ ...current, notes: event.target.value }))} />
      </label>
      <button type="button" className="loom-button-primary" onClick={() => onSave(localDraft)} disabled={isSaving}>
        {isSaving ? t("common.saving", "Saving...") : t("common.save", "Save")}
      </button>
    </article>
  );
}
