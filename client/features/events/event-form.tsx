"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";
import { sanitizeRecurrenceRule, type EventRecurrenceRule } from "@/features/events/recurrence";

const eventSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(5000).optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    durationMinutes: z.number().int().min(0).max(10080),
    location: z.string().trim().max(240).optional(),
    allDay: z.boolean(),
    visibility: z.enum(["private", "family", "selected_members"])
  })
  .refine((value) => new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(), {
    path: ["endAt"],
    message: "End date must be after start date"
  });

type EventValues = z.infer<typeof eventSchema>;

type EventInitialValues = Partial<EventValues> & {
  recurrenceRule?: EventRecurrenceRule | null;
};

type MemberOption = {
  userId: string;
  displayName: string;
};

type RecurrencePreset = "none" | "daily" | "weekly" | "monthly" | "yearly" | "weekdays" | "custom";
type RecurrenceUnit = "day" | "week" | "month" | "year";
type RecurrenceEndMode = "never" | "on" | "after";

type RecurrenceState = {
  enabled: boolean;
  preset: RecurrencePreset;
  customInterval: number;
  customUnit: RecurrenceUnit;
  customEndMode: RecurrenceEndMode;
  customUntilDate: string;
  customCount: number;
};

function parseLocalDateTime(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toDateTimeLocalValue(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toDateOnlyLocalValue(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getDurationMinutes(startAt: string, endAt: string) {
  const start = parseLocalDateTime(startAt);
  const end = parseLocalDateTime(endAt);
  if (!start || !end) {
    return 60;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function buildEndFromDuration(startAt: string, durationMinutes: number) {
  const start = parseLocalDateTime(startAt);
  if (!start) {
    return "";
  }

  const end = new Date(start.getTime() + Math.max(0, durationMinutes) * 60_000);
  return toDateTimeLocalValue(end);
}

function parseDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  return parsed;
}

function getNextHalfHour(reference: Date) {
  const result = new Date(reference);
  result.setSeconds(0, 0);

  if (result.getMinutes() < 30) {
    result.setMinutes(30, 0, 0);
    return result;
  }

  result.setHours(result.getHours() + 1, 0, 0, 0);
  return result;
}

function getDefaultEventTimes(defaultDate: string | undefined) {
  const nextSlot = getNextHalfHour(new Date());
  const selectedDate = parseDateOnly(defaultDate);

  const start = selectedDate
    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), nextSlot.getHours(), nextSlot.getMinutes(), 0, 0)
    : nextSlot;

  const end = new Date(start.getTime() + 60 * 60_000);

  return {
    startAt: toDateTimeLocalValue(start),
    endAt: toDateTimeLocalValue(end),
    durationMinutes: 60
  };
}

function getNthWeekdayInMonth(date: Date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getOrdinalLabel(value: number, locale: string) {
  if (locale.startsWith("pt")) {
    return `${value}.o`;
  }

  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function weekdaysEqual(left: number[] | undefined, right: number[]) {
  if (!left) {
    return false;
  }

  const normalizedLeft = [...left].sort((a, b) => a - b);
  const normalizedRight = [...right].sort((a, b) => a - b);
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function detectRecurrencePreset(rule: EventRecurrenceRule, startAt: Date): RecurrencePreset {
  const startWeekday = startAt.getDay();

  if (rule.frequency === "daily" && rule.interval === 1 && !rule.count && !rule.until) {
    return "daily";
  }

  if (rule.frequency === "weekly" && rule.interval === 1 && weekdaysEqual(rule.byWeekdays, [1, 2, 3, 4, 5])) {
    return "weekdays";
  }

  if (rule.frequency === "weekly" && rule.interval === 1 && weekdaysEqual(rule.byWeekdays, [startWeekday])) {
    return "weekly";
  }

  if (rule.frequency === "monthly" && rule.interval === 1) {
    return "monthly";
  }

  if (rule.frequency === "yearly" && rule.interval === 1) {
    return "yearly";
  }

  return "custom";
}

function getInitialRecurrenceState(startAtValue: string, recurrenceRule: EventRecurrenceRule | null | undefined): RecurrenceState {
  const startAt = parseLocalDateTime(startAtValue) ?? new Date();
  const normalized = sanitizeRecurrenceRule(recurrenceRule);

  if (!normalized) {
    return {
      enabled: false,
      preset: "none",
      customInterval: 1,
      customUnit: "week",
      customEndMode: "never",
      customUntilDate: toDateOnlyLocalValue(new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000)),
      customCount: 10
    };
  }

  const customUnit: RecurrenceUnit =
    normalized.frequency === "daily"
      ? "day"
      : normalized.frequency === "weekly"
        ? "week"
        : normalized.frequency === "monthly"
          ? "month"
          : "year";

  let customEndMode: RecurrenceEndMode = "never";
  if (normalized.until) {
    customEndMode = "on";
  }
  if (normalized.count) {
    customEndMode = "after";
  }

  return {
    enabled: true,
    preset: detectRecurrencePreset(normalized, startAt),
    customInterval: normalized.interval,
    customUnit,
    customEndMode,
    customUntilDate: normalized.until ? toDateOnlyLocalValue(new Date(normalized.until)) : toDateOnlyLocalValue(new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000)),
    customCount: normalized.count ?? 10
  };
}

function untilDateToIso(value: string) {
  const date = parseDateOnly(value);
  if (!date) {
    return undefined;
  }

  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function buildRecurrenceRule(state: RecurrenceState, startAtValue: string): EventRecurrenceRule | null {
  if (!state.enabled || state.preset === "none") {
    return null;
  }

  const startAt = parseLocalDateTime(startAtValue);
  if (!startAt) {
    return null;
  }

  const startWeekday = startAt.getDay();
  const nthWeekday = getNthWeekdayInMonth(startAt);
  const customInterval = Math.max(1, Math.min(365, Math.round(state.customInterval || 1)));

  const baseRule =
    state.preset === "daily"
      ? { frequency: "daily", interval: 1 }
      : state.preset === "weekly"
        ? { frequency: "weekly", interval: 1, byWeekdays: [startWeekday] }
        : state.preset === "monthly"
          ? { frequency: "monthly", interval: 1, byWeekdays: [startWeekday], bySetPos: nthWeekday }
          : state.preset === "yearly"
            ? { frequency: "yearly", interval: 1, byMonth: startAt.getMonth() + 1, byMonthDay: startAt.getDate() }
            : state.preset === "weekdays"
              ? { frequency: "weekly", interval: 1, byWeekdays: [1, 2, 3, 4, 5] }
              : state.customUnit === "day"
                ? { frequency: "daily", interval: customInterval }
                : state.customUnit === "week"
                  ? { frequency: "weekly", interval: customInterval, byWeekdays: [startWeekday] }
                  : state.customUnit === "month"
                    ? { frequency: "monthly", interval: customInterval, byWeekdays: [startWeekday], bySetPos: nthWeekday }
                    : { frequency: "yearly", interval: customInterval, byMonth: startAt.getMonth() + 1, byMonthDay: startAt.getDate() };

  const withEnd = {
    ...baseRule,
    until: state.preset === "custom" && state.customEndMode === "on" ? untilDateToIso(state.customUntilDate) : undefined,
    count: state.preset === "custom" && state.customEndMode === "after" ? Math.max(1, Math.min(5000, Math.round(state.customCount || 1))) : undefined
  };

  return sanitizeRecurrenceRule(withEnd);
}

export function EventForm({
  familyId,
  members,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  initialValues,
  defaultDate,
  disableRedirect = false,
  onSaved,
  saveMode = "submit",
  onSaveStateChange
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: EventInitialValues;
  defaultDate?: string;
  disableRedirect?: boolean;
  onSaved?: (payload: { eventId?: string; startAt: string }) => void;
  saveMode?: "submit" | "autosave";
  onSaveStateChange?: (state: "idle" | "pending" | "saving" | "saved" | "error") => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [timeInputMode, setTimeInputMode] = useState<"duration" | "endAt">("duration");
  const router = useRouter();
  const { t, locale } = useI18n();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timingDefaults = useMemo(() => getDefaultEventTimes(defaultDate), [defaultDate]);
  const defaultStartAt = initialValues?.startAt ?? timingDefaults.startAt;
  const defaultEndAt = initialValues?.endAt ?? timingDefaults.endAt;
  const defaultDurationMinutes = initialValues?.durationMinutes ?? getDurationMinutes(defaultStartAt, defaultEndAt);
  const recurrenceDefaults = useMemo(() => getInitialRecurrenceState(defaultStartAt, initialValues?.recurrenceRule), [defaultStartAt, initialValues?.recurrenceRule]);

  const [recurrence, setRecurrence] = useState<RecurrenceState>(recurrenceDefaults);

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      startAt: defaultStartAt,
      endAt: defaultEndAt,
      durationMinutes: defaultDurationMinutes,
      location: initialValues?.location ?? "",
      allDay: initialValues?.allDay ?? false,
      visibility: initialValues?.visibility ?? "family"
    }
  });

  const visibility = form.watch("visibility");
  const startAtValue = form.watch("startAt");
  const endAtValue = form.watch("endAt");
  const durationMinutesValue = form.watch("durationMinutes");
  const autosaveEnabled = saveMode === "autosave";

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [onSaveStateChange, saveState]);

  useEffect(() => {
    if (!autosaveEnabled || isLoading) {
      return;
    }

    if (form.formState.isDirty) {
      setSaveState((current) => (current === "saving" ? current : "pending"));
      return;
    }

    setSaveState((current) => (current === "saved" || current === "error" ? current : "idle"));
  }, [autosaveEnabled, form.formState.isDirty, isLoading]);

  const startAtDate = parseLocalDateTime(startAtValue) ?? new Date();
  const startWeekdayLabel = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", { weekday: "long" }).format(startAtDate);
  const startMonthDayLabel = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", { month: "long", day: "numeric" }).format(startAtDate);
  const startOrdinal = getOrdinalLabel(getNthWeekdayInMonth(startAtDate), locale);

  const startAtRegistration = form.register("startAt", {
    onChange: (event) => {
      const nextStartAt = String(event.target.value ?? "");
      const nextDuration = Number(form.getValues("durationMinutes") ?? 60);
      const currentEndAt = String(form.getValues("endAt") ?? "");

      if (timeInputMode === "endAt") {
        form.setValue("durationMinutes", getDurationMinutes(nextStartAt, currentEndAt), { shouldDirty: true, shouldValidate: true });
        return;
      }

      form.setValue("endAt", buildEndFromDuration(nextStartAt, nextDuration), { shouldDirty: true, shouldValidate: true });
    }
  });

  const endAtRegistration = form.register("endAt", {
    onChange: (event) => {
      const nextEndAt = String(event.target.value ?? "");
      const currentStartAt = String(form.getValues("startAt") ?? "");
      setTimeInputMode("endAt");
      form.setValue("durationMinutes", getDurationMinutes(currentStartAt, nextEndAt), { shouldDirty: true, shouldValidate: true });
    }
  });

  const durationRegistration = form.register("durationMinutes", {
    valueAsNumber: true,
    onChange: (event) => {
      const parsed = Number(event.target.value);
      const safeDuration = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
      const currentStartAt = String(form.getValues("startAt") ?? "");

      setTimeInputMode("duration");
      form.setValue("durationMinutes", safeDuration, { shouldDirty: true, shouldValidate: true });
      form.setValue("endAt", buildEndFromDuration(currentStartAt, safeDuration), { shouldDirty: true, shouldValidate: true });
    }
  });

  async function onSubmit(values: EventValues) {
    setServerError(null);
    setIsLoading(true);
    setSaveState("saving");

    const selectedMemberIds =
      visibility === "selected_members"
        ? Array.from(document.querySelectorAll<HTMLInputElement>('input[name="selectedMembers"]:checked')).map((input) => input.value)
        : [];

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        description: values.description || null,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        location: values.location || null,
        allDay: values.allDay,
        visibility: values.visibility,
        selectedMemberIds,
        recurrenceRule: buildRecurrenceRule(recurrence, values.startAt)
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; eventId?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("calendar.saveError", "Failed to save event"));
      setIsLoading(false);
      setSaveState("error");
      return;
    }

    onSaved?.({ eventId: payload?.eventId, startAt: values.startAt });

    if (disableRedirect) {
      setIsLoading(false);
      form.reset(values);
      setSaveState("saved");
      router.refresh();
      return;
    }

    const destination =
      method === "POST"
        ? `${redirectTo}?date=${encodeURIComponent(values.startAt.slice(0, 10))}`
        : payload?.eventId
          ? `/calendar/${payload.eventId}`
          : redirectTo;
    router.push(destination);
    router.refresh();
  }

  function triggerAutosave() {
    if (!autosaveEnabled || isLoading || !form.formState.isDirty) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  return (
    <form
      ref={formRef}
      className="loom-form-stack"
      onSubmit={form.handleSubmit(onSubmit)}
      onBlurCapture={() => {
        if (!autosaveEnabled) {
          return;
        }

        window.requestAnimationFrame(() => {
          triggerAutosave();
        });
      }}
      onKeyDown={(event) => {
        if (!autosaveEnabled) {
          return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          triggerAutosave();
        }
      }}
    >
      <label className="loom-field">
        <span>{t("common.title", "Title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>

      <label className="loom-field">
        <span>{t("common.description", "Description")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("calendar.starts", "Starts")}</span>
          <input className="loom-input" type="datetime-local" {...startAtRegistration} value={startAtValue} />
        </label>

        <label className="loom-field">
          <span>{t("calendar.duration", "Duration (minutes)")}</span>
          <input className="loom-input" type="number" min={0} step={15} {...durationRegistration} value={durationMinutesValue} />
        </label>

        <label className="loom-field">
          <span>{t("calendar.ends", "Ends")}</span>
          <input className="loom-input" type="datetime-local" {...endAtRegistration} value={endAtValue} />
        </label>
      </div>

      <div className="loom-soft-row">
        <div className="loom-row-between">
          <p className="m-0 font-semibold">{t("calendar.repeat", "Repeat")}</p>
          {!recurrence.enabled ? (
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() => setRecurrence((current) => ({ ...current, enabled: true, preset: current.preset === "none" ? "weekly" : current.preset }))}
            >
              {t("calendar.configureRecurrence", "Set recurrence")}
            </button>
          ) : null}
        </div>

        {recurrence.enabled ? (
          <div className="loom-stack-sm mt-3">
            <label className="loom-field">
              <span>{t("calendar.recurrenceType", "Recurrence")}</span>
              <select
                className="loom-input"
                value={recurrence.preset}
                onChange={(event) => {
                  const nextPreset = event.target.value as RecurrencePreset;
                  if (nextPreset === "none") {
                    setRecurrence((current) => ({ ...current, enabled: false, preset: "none" }));
                    return;
                  }
                  setRecurrence((current) => ({ ...current, enabled: true, preset: nextPreset }));
                }}
              >
                <option value="none">{t("calendar.noRecurrence", "Does not repeat")}</option>
                <option value="daily">{t("calendar.repeatDaily", "Daily")}</option>
                <option value="weekly">{`${t("calendar.repeatWeeklyOn", "Weekly on")} ${startWeekdayLabel}`}</option>
                <option value="monthly">{`${t("calendar.repeatMonthlyOn", "Monthly on the")} ${startOrdinal} ${startWeekdayLabel}`}</option>
                <option value="yearly">{`${t("calendar.repeatYearlyOn", "Annually on")} ${startMonthDayLabel}`}</option>
                <option value="weekdays">{t("calendar.repeatWeekdays", "Every weekday (Monday to Friday)")}</option>
                <option value="custom">{t("calendar.repeatCustom", "Custom...")}</option>
              </select>
            </label>

            {recurrence.preset === "custom" ? (
              <div className="loom-stack-sm">
                <div className="loom-form-inline">
                  <label className="loom-field">
                    <span>{t("calendar.customRepeatEvery", "Repeat every")}</span>
                    <input
                      className="loom-input"
                      type="number"
                      min={1}
                      max={365}
                      value={recurrence.customInterval}
                      onChange={(event) =>
                        setRecurrence((current) => ({
                          ...current,
                          customInterval: Math.max(1, Math.min(365, Math.round(Number(event.target.value) || 1)))
                        }))
                      }
                    />
                  </label>

                  <label className="loom-field">
                    <span>{t("calendar.customUnit", "Unit")}</span>
                    <select
                      className="loom-input"
                      value={recurrence.customUnit}
                      onChange={(event) => setRecurrence((current) => ({ ...current, customUnit: event.target.value as RecurrenceUnit }))}
                    >
                      <option value="day">{t("calendar.unitDay", "Day")}</option>
                      <option value="week">{t("calendar.unitWeek", "Week")}</option>
                      <option value="month">{t("calendar.unitMonth", "Month")}</option>
                      <option value="year">{t("calendar.unitYear", "Year")}</option>
                    </select>
                  </label>
                </div>

                <div className="loom-stack-sm">
                  <p className="m-0 font-semibold">{t("calendar.customEnds", "Ends")}</p>

                  <label className="loom-checkbox-row">
                    <input
                      type="radio"
                      name="event-recurrence-ends"
                      checked={recurrence.customEndMode === "never"}
                      onChange={() => setRecurrence((current) => ({ ...current, customEndMode: "never" }))}
                    />
                    <span>{t("calendar.endsNever", "Never")}</span>
                  </label>

                  <label className="loom-checkbox-row">
                    <input
                      type="radio"
                      name="event-recurrence-ends"
                      checked={recurrence.customEndMode === "on"}
                      onChange={() => setRecurrence((current) => ({ ...current, customEndMode: "on" }))}
                    />
                    <span>{t("calendar.endsOn", "On")}</span>
                    <input
                      className="loom-input"
                      type="date"
                      value={recurrence.customUntilDate}
                      disabled={recurrence.customEndMode !== "on"}
                      onChange={(event) => setRecurrence((current) => ({ ...current, customUntilDate: event.target.value }))}
                    />
                  </label>

                  <label className="loom-checkbox-row">
                    <input
                      type="radio"
                      name="event-recurrence-ends"
                      checked={recurrence.customEndMode === "after"}
                      onChange={() => setRecurrence((current) => ({ ...current, customEndMode: "after" }))}
                    />
                    <span>{t("calendar.endsAfter", "After")}</span>
                    <input
                      className="loom-input"
                      type="number"
                      min={1}
                      max={5000}
                      value={recurrence.customCount}
                      disabled={recurrence.customEndMode !== "after"}
                      onChange={(event) =>
                        setRecurrence((current) => ({
                          ...current,
                          customCount: Math.max(1, Math.min(5000, Math.round(Number(event.target.value) || 1)))
                        }))
                      }
                    />
                    <span>{t("calendar.occurrences", "occurrences")}</span>
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="m-0 loom-muted small mt-3">{t("calendar.noRecurrence", "Does not repeat")}</p>
        )}
      </div>

      <label className="loom-field">
        <span>{t("common.location", "Location")}</span>
        <input className="loom-input" type="text" {...form.register("location")} />
      </label>

      <label className="loom-field">
        <span>{t("common.visibility", "Visibility")}</span>
        <select className="loom-input" {...form.register("visibility")}>
          <option value="private">{t("visibility.private", "Private")}</option>
          <option value="family">{t("visibility.family", "Family")}</option>
          <option value="selected_members">{t("visibility.selected_members", "Selected members")}</option>
        </select>
      </label>

      <label className="loom-checkbox-row">
        <input type="checkbox" {...form.register("allDay")} />
        <span>{t("calendar.allDayEvent", "All day event")}</span>
      </label>

      {visibility === "selected_members" ? (
        <div className="loom-card soft p-4">
          <p className="m-0 font-semibold">{t("common.selectMembers", "Select members")}</p>
          <div className="loom-stack-sm mt-3">
            {members.map((member) => (
              <label key={member.userId} className="loom-checkbox-row">
                <input type="checkbox" name="selectedMembers" value={member.userId} />
                <span>{member.displayName}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {!autosaveEnabled ? (
        <button className="loom-button-primary" type="submit" disabled={isLoading}>
          {isLoading ? t("common.saving", "Saving...") : submitLabel}
        </button>
      ) : (
        <p className="loom-muted small m-0">{t("common.autoSaveHint", "Changes save automatically when you leave a field or press Ctrl+Enter.")}</p>
      )}

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}

