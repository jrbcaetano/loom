"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";
import {
  scheduleBlockSchema,
  scheduleColorSchema,
  type ScheduleCategory,
  type ScheduleOverrideDayInput,
  type SchedulePauseInput,
  type ScheduleSeriesRow,
  type ScheduleTemplateRow
} from "@/features/schedules/model";

const timeInputSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

const scheduleBlockDraftSchema = z.object({
  templateId: z.string().uuid().optional().nullable(),
  weekIndex: z.number().int().min(1).max(12),
  weekday: z.number().int().min(0).max(6),
  title: z.string().max(180).optional(),
  location: z.string().max(240).optional(),
  startsAtLocal: timeInputSchema,
  endsAtLocal: timeInputSchema,
  spansNextDay: z.boolean(),
  sortOrder: z.number().int().min(0).max(999).optional()
});

const scheduleFormSchema = z.object({
  familyMemberId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  category: z.enum(["work", "school", "sport", "custom"]),
  color: scheduleColorSchema,
  location: z.string().max(240).optional(),
  notes: z.string().max(5000).optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().optional(),
  repeatWeeks: z.string().optional(),
  cycleLengthWeeks: z.number().int().min(1).max(12),
  isEnabled: z.boolean(),
  blocks: z.array(scheduleBlockDraftSchema).max(96)
}).superRefine((value, context) => {
  if (value.category === "work") {
    if (!value.endsOn?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message: "End date is required for work schedules"
      });
    }
    return;
  }

  if (value.blocks.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blocks"],
      message: "Add at least one schedule block"
    });
  }
});

type ScheduleFormValues = z.input<typeof scheduleFormSchema>;

type FamilyMemberOption = {
  id: string;
  displayName: string;
  role: "admin" | "adult" | "child";
};

type ScheduleInitialValues = Partial<ScheduleFormValues> & {
  pauses?: SchedulePauseInput[];
  overrideDays?: ScheduleOverrideDayInput[];
};

type WorkDayDraft = {
  overrideDate: string;
  mode: "none" | "template" | "custom";
  templateId: string;
  title: string;
  location: string;
  startsAtLocal: string;
  endsAtLocal: string;
  spansNextDay: boolean;
  notes: string;
};

const weekdayLabels = [
  { value: 0, key: "calendar.sun", fallback: "Sun" },
  { value: 1, key: "calendar.mon", fallback: "Mon" },
  { value: 2, key: "calendar.tue", fallback: "Tue" },
  { value: 3, key: "calendar.wed", fallback: "Wed" },
  { value: 4, key: "calendar.thu", fallback: "Thu" },
  { value: 5, key: "calendar.fri", fallback: "Fri" },
  { value: 6, key: "calendar.sat", fallback: "Sat" }
] as const;

const scheduleColorOptions = ["#7c88d9", "#eab308", "#0ea5a4", "#f97316", "#8b27b0", "#ef4444", "#10b981", "#596579"];

function emptyBlock(weekIndex = 1) {
  return {
    weekIndex,
    weekday: 1,
    title: "",
    location: "",
    startsAtLocal: "09:00",
    endsAtLocal: "17:00",
    spansNextDay: false,
    sortOrder: 0
  };
}

function emptyWorkDay(overrideDate: string): WorkDayDraft {
  return {
    overrideDate,
    mode: "none",
    templateId: "",
    title: "",
    location: "",
    startsAtLocal: "09:00",
    endsAtLocal: "17:00",
    spansNextDay: false,
    notes: ""
  };
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateEndDateFromWeeks(startsOn: string, repeatWeeks: string) {
  const start = parseDateOnly(startsOn);
  const weeks = Number.parseInt(repeatWeeks, 10);
  if (!start || !Number.isFinite(weeks) || weeks <= 0) {
    return "";
  }

  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7 - 1);
  return formatDateOnly(end);
}

function calculateRepeatWeeks(startsOn: string, endsOn: string) {
  const start = parseDateOnly(startsOn);
  const end = parseDateOnly(endsOn);
  if (!start || !end || end.getTime() < start.getTime()) {
    return "";
  }

  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return String(Math.max(1, Math.ceil(diffDays / 7)));
}

function buildDateRange(startsOn: string, endsOn: string) {
  const start = parseDateOnly(startsOn);
  const end = parseDateOnly(endsOn);
  if (!start || !end || end.getTime() < start.getTime()) {
    return [] as string[];
  }

  const dates: string[] = [];
  for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatDateOnly(cursor));
  }
  return dates;
}

function applyTemplateToWorkDay(day: WorkDayDraft, template: ScheduleTemplateRow | null): WorkDayDraft {
  if (!template) {
    return emptyWorkDay(day.overrideDate);
  }

  return {
    ...day,
    mode: "template",
    templateId: template.id,
    title: template.title,
    location: template.location ?? "",
    startsAtLocal: template.startsAtLocal.slice(0, 5),
    endsAtLocal: template.endsAtLocal.slice(0, 5),
    spansNextDay: template.spansNextDay
  };
}

function createWorkDayFromOverride(overrideDay: ScheduleOverrideDayInput): WorkDayDraft {
  const block = overrideDay.blocks[0];
  if (!block) {
    return emptyWorkDay(overrideDay.overrideDate);
  }

  return {
    overrideDate: overrideDay.overrideDate,
    mode: block.templateId ? "template" : "custom",
    templateId: block.templateId ?? "",
    title: block.title,
    location: block.location ?? "",
    startsAtLocal: block.startsAtLocal.slice(0, 5),
    endsAtLocal: block.endsAtLocal.slice(0, 5),
    spansNextDay: block.spansNextDay,
    notes: overrideDay.notes ?? ""
  };
}

function isAllDayWorkOverride(overrideDay: ScheduleOverrideDayInput) {
  return overrideDay.blocks.length === 1
    && !overrideDay.blocks[0]?.templateId
    && overrideDay.blocks[0]?.startsAtLocal.slice(0, 5) === "00:00"
    && overrideDay.blocks[0]?.endsAtLocal.slice(0, 5) === "23:59"
    && !overrideDay.blocks[0]?.spansNextDay;
}

function categoryOptions(t: (key: string, fallback?: string) => string): Array<{ value: ScheduleCategory; label: string }> {
  return [
    { value: "work", label: t("schedules.categoryWork", "Work") },
    { value: "school", label: t("schedules.categorySchool", "School") },
    { value: "sport", label: t("schedules.categorySport", "Sport") },
    { value: "custom", label: t("schedules.categoryCustom", "Custom") }
  ];
}

function sortWorkDays(days: WorkDayDraft[]) {
  return days.slice().sort((left, right) => left.overrideDate.localeCompare(right.overrideDate));
}

function promoteWorkDayToCustom(day: WorkDayDraft, fallbackTitle: string, fallbackLocation: string) {
  return {
    ...day,
    mode: "custom" as const,
    templateId: "",
    title: day.title || fallbackTitle || "Shift",
    location: day.location || fallbackLocation
  };
}

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

export function ScheduleForm({
  familyId,
  familyMembers,
  templates,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  initialValues,
  onSaved,
  autoSave = false,
  refreshOnSave = true,
  onAutoSaveStateChange
}: {
  familyId: string;
  familyMembers: FamilyMemberOption[];
  templates: ScheduleTemplateRow[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: ScheduleInitialValues;
  onSaved?: (scheduleId: string, savedSchedule?: ScheduleSeriesRow) => void;
  autoSave?: boolean;
  refreshOnSave?: boolean;
  onAutoSaveStateChange?: (state: "idle" | "saving" | "saved", error?: string | null) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const workTemplates = useMemo(() => templates, [templates]);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const queuedAutoSaveRef = useRef(false);
  const didMountAutoSaveRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const initialCategory = initialValues?.category ?? "custom";
  const initialOverrideDays = initialValues?.overrideDays ?? [];
  const initialWorkUsesShifts = initialCategory === "work" && initialOverrideDays.some((overrideDay) => !isAllDayWorkOverride(overrideDay));
  const [defaultWorkTemplateId, setDefaultWorkTemplateId] = useState("");
  const [configureWorkShifts, setConfigureWorkShifts] = useState(initialWorkUsesShifts);
  const [workDays, setWorkDays] = useState<WorkDayDraft[]>(() => {
    if (initialCategory !== "work") {
      return [];
    }

    return sortWorkDays(initialOverrideDays.map(createWorkDayFromOverride));
  });

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      familyMemberId: initialValues?.familyMemberId ?? familyMembers[0]?.id ?? "",
      title: initialValues?.title ?? "",
      category: initialCategory,
      color: initialValues?.color ?? "#7c88d9",
      location: initialValues?.location ?? "",
      notes: initialValues?.notes ?? "",
      startsOn: initialValues?.startsOn ?? new Date().toISOString().slice(0, 10),
      endsOn: initialValues?.endsOn ?? "",
      repeatWeeks: initialValues?.startsOn && initialValues?.endsOn ? calculateRepeatWeeks(initialValues.startsOn, initialValues.endsOn) : "",
      cycleLengthWeeks: initialValues?.cycleLengthWeeks ?? 1,
      isEnabled: initialValues?.isEnabled ?? true,
      blocks: initialValues?.blocks && initialValues.blocks.length > 0 ? initialValues.blocks : [emptyBlock()]
    }
  });

  const blocks = useFieldArray({
    control: form.control,
    name: "blocks"
  });

  const pauses = initialValues?.pauses ?? [];
  const savedOverrideDays = initialValues?.overrideDays ?? [];
  const category = form.watch("category");
  const startsOn = form.watch("startsOn");
  const endsOn = form.watch("endsOn") ?? "";
  const repeatWeeks = form.watch("repeatWeeks") ?? "";
  const selectedColor = form.watch("color");
  const watchedValues = form.watch();
  const isWorkCategory = category === "work";
  const workDayDates = useMemo(() => (isWorkCategory && endsOn ? buildDateRange(startsOn, endsOn) : []), [endsOn, isWorkCategory, startsOn]);
  const formErrors = form.formState.errors;

  const buildPayload = useCallback((values: ScheduleFormValues) => {
    const isWorkSchedule = values.category === "work";

    return {
      familyId,
      familyMemberId: values.familyMemberId,
      title: values.title,
      category: values.category,
      color: values.color,
      location: values.location || null,
      notes: values.notes || null,
      startsOn: values.startsOn,
      endsOn: isWorkSchedule ? values.endsOn || null : values.endsOn || (values.repeatWeeks ? calculateEndDateFromWeeks(values.startsOn, values.repeatWeeks) : null),
      cycleLengthWeeks: isWorkSchedule ? 1 : values.cycleLengthWeeks,
      isEnabled: values.isEnabled,
      blocks: isWorkSchedule
        ? []
        : values.blocks.map((block, index) => ({
            ...scheduleBlockSchema.parse({
              ...block,
              title: (block.title || values.title).trim(),
              location: (block.location || values.location || "").trim() || null,
              sortOrder: index
            }),
            startsAtLocal: block.startsAtLocal.length === 5 ? `${block.startsAtLocal}:00` : block.startsAtLocal,
            endsAtLocal: block.endsAtLocal.length === 5 ? `${block.endsAtLocal}:00` : block.endsAtLocal
          })),
      pauses,
      overrideDays: isWorkSchedule
        ? configureWorkShifts
          ? workDays
              .filter((day) => day.mode !== "none")
              .map((day) => ({
                overrideDate: day.overrideDate,
                notes: day.notes || null,
                blocks: [
                  {
                    templateId: day.templateId || null,
                    title: day.title,
                    location: day.location || null,
                    startsAtLocal: `${day.startsAtLocal}:00`,
                    endsAtLocal: `${day.endsAtLocal}:00`,
                    spansNextDay: day.spansNextDay,
                    sortOrder: 0
                  }
                ]
              }))
          : buildDateRange(values.startsOn, values.endsOn || values.startsOn).map((date) => ({
              overrideDate: date,
              notes: null,
              blocks: [
                {
                  templateId: null,
                  title: values.title,
                  location: values.location || null,
                  startsAtLocal: "00:00:00",
                  endsAtLocal: "23:59:00",
                  spansNextDay: false,
                  sortOrder: 0
                }
              ]
            }))
        : savedOverrideDays
    };
  }, [configureWorkShifts, familyId, pauses, savedOverrideDays, workDays]);

  const buildSaveSnapshot = useCallback((values: ScheduleFormValues) => {
    return JSON.stringify({
      values,
      configureWorkShifts,
      defaultWorkTemplateId,
      workDays
    });
  }, [configureWorkShifts, defaultWorkTemplateId, workDays]);

  useEffect(() => {
    if (!isWorkCategory) {
      return;
    }

    setWorkDays((current) => {
      const currentMap = new Map(current.map((day) => [day.overrideDate, day]));
      return sortWorkDays(
        workDayDates.map((date) => {
          const existing = currentMap.get(date);
          if (existing) {
            return existing;
          }

          const defaultTemplate = workTemplates.find((template) => template.id === defaultWorkTemplateId) ?? null;
          return applyTemplateToWorkDay(emptyWorkDay(date), defaultTemplate);
        })
      );
    });
  }, [defaultWorkTemplateId, isWorkCategory, workDayDates, workTemplates]);

  function handleStartsOnChange(nextStartsOn: string) {
    form.setValue("startsOn", nextStartsOn, { shouldDirty: true });
    if (isWorkCategory) {
      return;
    }

    if (repeatWeeks.trim()) {
      form.setValue("endsOn", calculateEndDateFromWeeks(nextStartsOn, repeatWeeks), { shouldDirty: true });
      return;
    }

    if (endsOn.trim()) {
      form.setValue("repeatWeeks", calculateRepeatWeeks(nextStartsOn, endsOn), { shouldDirty: true });
    }
  }

  function handleRepeatWeeksChange(nextRepeatWeeks: string) {
    form.setValue("repeatWeeks", nextRepeatWeeks, { shouldDirty: true });
    if (!nextRepeatWeeks.trim()) {
      return;
    }

    const startsOn = form.getValues("startsOn");
    form.setValue("endsOn", calculateEndDateFromWeeks(startsOn, nextRepeatWeeks), { shouldDirty: true });
  }

  function handleEndsOnChange(nextEndsOn: string) {
    form.setValue("endsOn", nextEndsOn, { shouldDirty: true });
    if (isWorkCategory) {
      return;
    }

    if (!nextEndsOn.trim()) {
      form.setValue("repeatWeeks", "", { shouldDirty: true });
      return;
    }

    const startsOn = form.getValues("startsOn");
    form.setValue("repeatWeeks", calculateRepeatWeeks(startsOn, nextEndsOn), { shouldDirty: true });
  }

  function applyTemplateToBlock(index: number, templateId: string) {
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) {
      return;
    }

    form.setValue(`blocks.${index}.templateId`, template.id, { shouldDirty: true });
    form.setValue(`blocks.${index}.title`, template.title, { shouldDirty: true });
    form.setValue(`blocks.${index}.location`, template.location ?? "", { shouldDirty: true });
    form.setValue(`blocks.${index}.startsAtLocal`, template.startsAtLocal.slice(0, 5), { shouldDirty: true });
    form.setValue(`blocks.${index}.endsAtLocal`, template.endsAtLocal.slice(0, 5), { shouldDirty: true });
    form.setValue(`blocks.${index}.spansNextDay`, template.spansNextDay, { shouldDirty: true });
  }

  function applyDefaultTemplateToAllDays() {
    const template = workTemplates.find((entry) => entry.id === defaultWorkTemplateId) ?? null;
    if (!template) {
      return;
    }

    setWorkDays((current) => current.map((day) => applyTemplateToWorkDay(day, template)));
  }

  function updateWorkDay(overrideDate: string, updater: (current: WorkDayDraft) => WorkDayDraft) {
    setWorkDays((current) => sortWorkDays(current.map((day) => (day.overrideDate === overrideDate ? updater(day) : day))));
  }

  async function persistSchedule(values: ScheduleFormValues, options?: { isAutoSave?: boolean }) {
    setServerError(null);
    setIsLoading(true);
    if (options?.isAutoSave) {
      setSaveState("saving");
    }

    const payload = buildPayload(values);

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = (await response.json().catch(() => null)) as { scheduleId?: string; schedule?: ScheduleSeriesRow; error?: string } | null;
    if (!response.ok) {
      setServerError(result?.error ?? t("schedules.saveError", "Failed to save schedule"));
      setIsLoading(false);
      if (options?.isAutoSave) {
        setSaveState("idle");
      }
      return { ok: false as const, scheduleId: "", savedSchedule: undefined };
    }

    const savedId = result?.scheduleId ?? result?.schedule?.id ?? redirectTo.split("/").filter(Boolean).at(-1) ?? "";
    const savedSchedule = result?.schedule;
    if (savedId && onSaved) {
      onSaved(savedId, savedSchedule);
    }

    if (options?.isAutoSave) {
      setIsLoading(false);
      setSaveState("saved");
      return { ok: true as const, scheduleId: savedId, savedSchedule };
    }

    if (onSaved) {
      if (refreshOnSave) {
        router.refresh();
      }
      setIsLoading(false);
      return { ok: true as const, scheduleId: savedId, savedSchedule };
    }

    const next = result?.scheduleId ? `/schedules/${result.scheduleId}` : redirectTo;
    router.push(next);
    if (refreshOnSave) {
      router.refresh();
    }
    setIsLoading(false);
    return { ok: true as const, scheduleId: savedId, savedSchedule };
  }

  async function onSubmit(values: ScheduleFormValues) {
    await persistSchedule(values);
  }

  function onInvalid() {
    setServerError(t("schedules.validationError", "Please review the highlighted schedule fields and try again."));
    setSaveState("idle");
    setIsLoading(false);
  }

  async function runAutoSave() {
    if (!autoSave) {
      return false;
    }

    if (isLoading) {
      queuedAutoSaveRef.current = true;
      return false;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      setServerError(t("schedules.validationError", "Please review the highlighted schedule fields and try again."));
      setSaveState("idle");
      return false;
    }

    const values = form.getValues();
    const snapshot = buildSaveSnapshot(values);
    if (snapshot === lastSavedSnapshotRef.current) {
      return true;
    }

    const result = await persistSchedule(values, { isAutoSave: true });
    if (!result.ok) {
      return false;
    }

    lastSavedSnapshotRef.current = snapshot;
    form.reset(values);

    if (queuedAutoSaveRef.current) {
      queuedAutoSaveRef.current = false;
      return runAutoSave();
    }

    return true;
  }

  useEffect(() => {
    if (!autoSave) {
      return;
    }

    if (!didMountAutoSaveRef.current) {
      didMountAutoSaveRef.current = true;
      lastSavedSnapshotRef.current = buildSaveSnapshot(form.getValues());
      return;
    }

    setServerError(null);
    setSaveState("idle");

    if (autoSaveTimeoutRef.current) {
      window.clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null;
      void runAutoSave();
    }, 450);

    return () => {
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [autoSave, buildSaveSnapshot, configureWorkShifts, defaultWorkTemplateId, form, watchedValues, workDays]);

  useEffect(() => {
    if (!autoSave || !onAutoSaveStateChange) {
      return;
    }

    onAutoSaveStateChange(saveState, serverError);
  }, [autoSave, onAutoSaveStateChange, saveState, serverError]);

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("schedules.forMember", "For family member")}</span>
          <select className="loom-input" {...form.register("familyMemberId")}>
            {familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="loom-field">
          <span>{t("schedules.category", "Category")}</span>
          <select className="loom-input" {...form.register("category")}>
            {categoryOptions(t).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("common.title", "Title")}</span>
          <input className="loom-input" type="text" {...form.register("title")} />
          {readErrorMessage(formErrors.title) ? <span className="loom-feedback-error small">{readErrorMessage(formErrors.title)}</span> : null}
        </label>
        <label className="loom-field">
          <span>{t("common.location", "Location")}</span>
          <input className="loom-input" type="text" {...form.register("location")} />
        </label>
      </div>

      <section className="loom-card p-4">
        <div className="loom-form-inline">
          <label className="loom-field">
            <span>{t("schedules.color", "Color")}</span>
            <div className="loom-schedule-color-field">
              <input className="loom-schedule-color-input" type="color" {...form.register("color")} />
              <span className="loom-input">{selectedColor}</span>
            </div>
          </label>
          <div className="loom-field">
            <span>{t("schedules.colorPresets", "Quick colors")}</span>
            <div className="loom-schedule-color-swatches">
              {scheduleColorOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`loom-schedule-color-swatch ${selectedColor === option ? "is-active" : ""}`.trim()}
                  style={{ backgroundColor: option }}
                  aria-label={`${t("schedules.color", "Color")} ${option}`}
                  onClick={() => form.setValue("color", option, { shouldDirty: true })}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <label className="loom-field">
        <span>{t("common.notes", "Notes")}</span>
        <textarea className="loom-input" rows={3} {...form.register("notes")} />
      </label>

      <section className="loom-card p-4">
        <div className="loom-form-inline">
          <label className="loom-field">
            <span>{t("schedules.startsOn", "Starts on")}</span>
            <input className="loom-input" type="date" value={startsOn} onChange={(event) => handleStartsOnChange(event.target.value)} />
            {readErrorMessage(formErrors.startsOn) ? <span className="loom-feedback-error small">{readErrorMessage(formErrors.startsOn)}</span> : null}
          </label>
          <label className="loom-field">
            <span>{t("schedules.endsOn", "Ends on")}</span>
            <input className="loom-input" type="date" value={endsOn} onChange={(event) => handleEndsOnChange(event.target.value)} />
            {readErrorMessage(formErrors.endsOn) ? <span className="loom-feedback-error small">{readErrorMessage(formErrors.endsOn)}</span> : null}
          </label>
          {isWorkCategory ? null : (
            <>
              <label className="loom-field">
                <span>{t("schedules.repeatWeeks", "Repeat for weeks")}</span>
                <input className="loom-input" type="number" min={1} value={repeatWeeks} onChange={(event) => handleRepeatWeeksChange(event.target.value)} />
              </label>
              <label className="loom-field">
                <span>{t("schedules.cycleLengthWeeks", "Cycle length (weeks)")}</span>
                <input className="loom-input" type="number" min={1} max={12} {...form.register("cycleLengthWeeks", { valueAsNumber: true })} />
              </label>
            </>
          )}
        </div>
        <p className="loom-muted small mt-2 mb-0">
          {isWorkCategory
            ? t("schedules.workDateRangeHint", "Work schedules are built from a date range and then assigned day by day.")
            : t("schedules.repeatModeHint", "You can set a number of weeks or an end date. Updating one keeps the other in sync.")}
        </p>
      </section>

      <label className="loom-checkbox">
        <input type="checkbox" {...form.register("isEnabled")} />
        <span>{t("schedules.enabled", "Schedule is active")}</span>
      </label>

      {isWorkCategory ? (
        <section className="loom-card p-4">
          <div className="loom-row-between">
            <div>
              <h3 className="loom-section-title">{t("schedules.workShiftsTitle", "Set shifts")}</h3>
              <p className="loom-muted small m-0">
                {t("schedules.workShiftsHint", "Turn shift configuration on when you need a day-by-day roster. If you leave it off, the work schedule is treated as a full-day event across the selected dates.")}
              </p>
            </div>
          </div>

          <label className="loom-checkbox mt-3">
            <input type="checkbox" checked={configureWorkShifts} onChange={(event) => setConfigureWorkShifts(event.target.checked)} />
            <span>{t("schedules.configureShifts", "Configure shifts")}</span>
          </label>

          {configureWorkShifts ? (
            <>
          <div className="loom-form-inline mt-3">
            <label className="loom-field">
              <span>{t("schedules.defaultShift", "Default shift")}</span>
              <select className="loom-input" value={defaultWorkTemplateId} onChange={(event) => setDefaultWorkTemplateId(event.target.value)}>
                <option value="">{t("schedules.noDefaultShift", "No default shift")}</option>
                {workTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="loom-field">
              <span>{t("schedules.applyDefault", "Apply default")}</span>
              <button type="button" className="loom-button-ghost" onClick={applyDefaultTemplateToAllDays} disabled={!defaultWorkTemplateId || workDays.length === 0}>
                {t("schedules.applyDefaultToAllDays", "Apply to all days")}
              </button>
            </div>
          </div>

          {!endsOn ? (
            <p className="loom-muted small mt-3 mb-0">{t("schedules.workRequiresEndDate", "Set an end date to generate the daily shift list.")}</p>
          ) : workDays.length === 0 ? (
            <p className="loom-muted small mt-3 mb-0">{t("schedules.workNoDays", "No days were generated for that range.")}</p>
          ) : (
            <div className="loom-stack-sm mt-3">
              {workDays.map((day) => (
                <article key={day.overrideDate} className="loom-workday-card">
                  <div className="loom-row-between">
                    <div>
                      <strong>{day.overrideDate}</strong>
                      <p className="loom-muted small m-0">
                        {day.mode === "none"
                          ? t("schedules.noShiftAssigned", "No shift assigned")
                          : `${day.startsAtLocal} - ${day.endsAtLocal}${day.spansNextDay ? ` · ${t("schedules.crossesMidnight", "Ends on the next day")}` : ""}`}
                      </p>
                    </div>
                    <div className="loom-inline-actions">
                      <select
                        className="loom-input"
                        value={day.mode === "template" ? day.templateId : day.mode}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (nextValue === "none") {
                            updateWorkDay(day.overrideDate, () => emptyWorkDay(day.overrideDate));
                            return;
                          }

                          if (nextValue === "custom") {
                            updateWorkDay(day.overrideDate, (current) => promoteWorkDayToCustom(current, form.getValues("title"), form.getValues("location") ?? ""));
                            return;
                          }

                          const template = workTemplates.find((entry) => entry.id === nextValue) ?? null;
                          updateWorkDay(day.overrideDate, (current) => applyTemplateToWorkDay(current, template));
                        }}
                      >
                        <option value="none">{t("schedules.noShift", "No shift")}</option>
                        {workTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                        <option value="custom">{t("schedules.customShift", "Custom shift")}</option>
                      </select>
                      {day.mode !== "none" && day.mode !== "custom" ? (
                        <button
                          type="button"
                          className="loom-button-ghost"
                          onClick={() =>
                            updateWorkDay(day.overrideDate, (current) => promoteWorkDayToCustom(current, form.getValues("title"), form.getValues("location") ?? ""))
                          }
                        >
                          {t("schedules.customiseDay", "Custom edit")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {day.mode === "custom" ? (
                    <div className="loom-stack-sm mt-3">
                      <div className="loom-form-inline">
                        <label className="loom-field">
                          <span>{t("common.title", "Title")}</span>
                          <input
                            className="loom-input"
                            type="text"
                            value={day.title}
                            onChange={(event) => updateWorkDay(day.overrideDate, (current) => ({ ...current, title: event.target.value }))}
                          />
                        </label>
                        <label className="loom-field">
                          <span>{t("common.location", "Location")}</span>
                          <input
                            className="loom-input"
                            type="text"
                            value={day.location}
                            onChange={(event) => updateWorkDay(day.overrideDate, (current) => ({ ...current, location: event.target.value }))}
                          />
                        </label>
                      </div>
                      <div className="loom-form-inline">
                        <label className="loom-field">
                          <span>{t("schedules.startsAt", "Starts at")}</span>
                          <input
                            className="loom-input"
                            type="time"
                            value={day.startsAtLocal}
                            onChange={(event) => updateWorkDay(day.overrideDate, (current) => ({ ...current, startsAtLocal: event.target.value }))}
                          />
                        </label>
                        <label className="loom-field">
                          <span>{t("schedules.endsAt", "Ends at")}</span>
                          <input
                            className="loom-input"
                            type="time"
                            value={day.endsAtLocal}
                            onChange={(event) => updateWorkDay(day.overrideDate, (current) => ({ ...current, endsAtLocal: event.target.value }))}
                          />
                        </label>
                        <label className="loom-checkbox">
                          <input
                            type="checkbox"
                            checked={day.spansNextDay}
                            onChange={(event) => updateWorkDay(day.overrideDate, (current) => ({ ...current, spansNextDay: event.target.checked }))}
                          />
                          <span>{t("schedules.crossesMidnight", "Ends on the next day")}</span>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
            </>
          ) : (
            <p className="loom-muted small mt-3 mb-0">{t("schedules.workAllDayHint", "This work schedule will be treated as a full-day entry for each day in the selected date range.")}</p>
          )}
        </section>
      ) : (
        <section className="loom-card p-4">
          <div className="loom-row-between">
            <div>
              <h3 className="loom-section-title">{t("schedules.blocksTitle", "Schedule blocks")}</h3>
              <p className="loom-muted small m-0">
                {t("schedules.blocksHint", "Add one or more repeating blocks. Use different week numbers when the pattern rotates across multiple weeks.")}
              </p>
              {readErrorMessage(formErrors.blocks) ? <p className="loom-feedback-error small mt-2 mb-0">{readErrorMessage(formErrors.blocks)}</p> : null}
            </div>
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() => blocks.append({ ...emptyBlock(1), sortOrder: blocks.fields.length })}
            >
              {t("schedules.addBlock", "Add block")}
            </button>
          </div>

          <div className="loom-stack-sm mt-3">
            {blocks.fields.map((field, index) => (
              <article key={field.id} className="loom-card p-4">
                <div className="loom-row-between">
                  <strong>{t("schedules.blockN", "Block")} {index + 1}</strong>
                  {blocks.fields.length > 1 ? (
                    <button type="button" className="loom-button-ghost" onClick={() => blocks.remove(index)}>
                      {t("common.remove", "Remove")}
                    </button>
                  ) : null}
                </div>

                <div className="loom-form-inline mt-3">
                  <label className="loom-field">
                    <span>{t("schedules.template", "Template")}</span>
                    <select
                      className="loom-input"
                      value={form.watch(`blocks.${index}.templateId`) ?? ""}
                      onChange={(event) => applyTemplateToBlock(index, event.target.value)}
                    >
                      <option value="">{t("schedules.noTemplate", "No template")}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="loom-field">
                    <span>{t("schedules.weekIndex", "Week in cycle")}</span>
                    <input className="loom-input" type="number" min={1} max={12} {...form.register(`blocks.${index}.weekIndex`, { valueAsNumber: true })} />
                  </label>
                  <label className="loom-field">
                    <span>{t("schedules.weekday", "Weekday")}</span>
                    <select className="loom-input" {...form.register(`blocks.${index}.weekday`, { valueAsNumber: true })}>
                      {weekdayLabels.map((weekday) => (
                        <option key={weekday.value} value={weekday.value}>
                          {t(weekday.key, weekday.fallback)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="loom-form-inline">
                  <label className="loom-field">
                    <span>{t("common.title", "Title")}</span>
                    <input className="loom-input" type="text" {...form.register(`blocks.${index}.title`)} />
                  </label>
                  <label className="loom-field">
                    <span>{t("common.location", "Location")}</span>
                    <input className="loom-input" type="text" {...form.register(`blocks.${index}.location`)} />
                  </label>
                </div>

                <div className="loom-form-inline">
                  <label className="loom-field">
                    <span>{t("schedules.startsAt", "Starts at")}</span>
                    <input className="loom-input" type="time" {...form.register(`blocks.${index}.startsAtLocal`)} />
                  </label>
                  <label className="loom-field">
                    <span>{t("schedules.endsAt", "Ends at")}</span>
                    <input className="loom-input" type="time" {...form.register(`blocks.${index}.endsAtLocal`)} />
                  </label>
                  <label className="loom-checkbox">
                    <input type="checkbox" {...form.register(`blocks.${index}.spansNextDay`)} />
                    <span>{t("schedules.crossesMidnight", "Ends on the next day")}</span>
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(pauses.length > 0 || (!isWorkCategory && savedOverrideDays.length > 0)) ? (
        <section className="loom-card p-4">
          <h3 className="loom-section-title">{t("schedules.savedExceptions", "Saved exceptions")}</h3>
          <p className="loom-muted small m-0">
            {t(
              "schedules.savedExceptionsHint",
              "Pauses and one-off day overrides are preserved when you save this schedule. Manage them from the schedule detail page."
            )}
          </p>
          <p className="loom-muted small mt-2 mb-0">
            {t("schedules.savedExceptionsCount", "Currently saved")}: {pauses.length} {t("schedules.pauses", "pauses")}, {(isWorkCategory ? workDays.filter((day) => day.mode !== "none").length : savedOverrideDays.length)} {t("schedules.overrideDays", "override days")}
          </p>
        </section>
      ) : null}

      {autoSave ? null : (
        <button className="loom-button-primary" type="submit" disabled={isLoading}>
          {isLoading ? t("common.saving", "Saving...") : submitLabel}
        </button>
      )}
      {Object.keys(formErrors).length > 0 ? <p className="loom-feedback-error">{t("schedules.validationError", "Please review the highlighted schedule fields and try again.")}</p> : null}
      {serverError && !autoSave ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
