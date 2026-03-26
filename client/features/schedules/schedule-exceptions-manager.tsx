"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type {
  ScheduleOverrideDayInput,
  SchedulePauseInput,
  ScheduleSeriesRow,
  ScheduleTemplateRow
} from "@/features/schedules/model";

function emptyOverrideBlock() {
  return {
    title: "",
    location: "",
    startsAtLocal: "09:00",
    endsAtLocal: "17:00",
    spansNextDay: false,
    sortOrder: 0
  };
}

function emptyOverrideDay(): ScheduleOverrideDayInput {
  return {
    overrideDate: new Date().toISOString().slice(0, 10),
    notes: "",
    blocks: [emptyOverrideBlock()]
  };
}

export function ScheduleExceptionsManager({
  schedule,
  templates
}: {
  schedule: ScheduleSeriesRow;
  templates: ScheduleTemplateRow[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pauses, setPauses] = useState<SchedulePauseInput[]>(
    schedule.pauses.map((pause) => ({
      startOn: pause.startOn,
      endOn: pause.endOn,
      reason: pause.reason ?? ""
    }))
  );
  const [overrideDays, setOverrideDays] = useState<ScheduleOverrideDayInput[]>(
    schedule.overrideDays.map((overrideDay) => ({
      overrideDate: overrideDay.overrideDate,
      notes: overrideDay.notes ?? "",
      blocks: overrideDay.blocks.map((block) => ({
        templateId: block.templateId,
        title: block.title,
        location: block.location ?? "",
        startsAtLocal: block.startsAtLocal,
        endsAtLocal: block.endsAtLocal,
        spansNextDay: block.spansNextDay,
        sortOrder: block.sortOrder
      }))
    }))
  );
  const [pauseDraft, setPauseDraft] = useState({
    startOn: schedule.startsOn,
    endOn: schedule.startsOn,
    reason: ""
  });
  const [overrideDraft, setOverrideDraft] = useState<ScheduleOverrideDayInput>(emptyOverrideDay());
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setPauses(
      schedule.pauses.map((pause) => ({
        startOn: pause.startOn,
        endOn: pause.endOn,
        reason: pause.reason ?? ""
      }))
    );
    setOverrideDays(
      schedule.overrideDays.map((overrideDay) => ({
        overrideDate: overrideDay.overrideDate,
        notes: overrideDay.notes ?? "",
        blocks: overrideDay.blocks.map((block) => ({
          templateId: block.templateId,
          title: block.title,
          location: block.location ?? "",
          startsAtLocal: block.startsAtLocal,
          endsAtLocal: block.endsAtLocal,
          spansNextDay: block.spansNextDay,
          sortOrder: block.sortOrder
        }))
      }))
    );
  }, [schedule.overrideDays, schedule.pauses]);

  async function persist(nextPauses = pauses, nextOverrideDays = overrideDays) {
    setErrorText(null);
    setIsSaving(true);

    const response = await fetch(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId: schedule.familyId,
        familyMemberId: schedule.familyMemberId,
        title: schedule.title,
        category: schedule.category,
        location: schedule.location,
        notes: schedule.notes,
        startsOn: schedule.startsOn,
        endsOn: schedule.endsOn,
        cycleLengthWeeks: schedule.cycleLengthWeeks,
        isEnabled: schedule.isEnabled,
        blocks: schedule.blocks.map((block) => ({
          templateId: block.templateId,
          weekIndex: block.weekIndex,
          weekday: block.weekday,
          title: block.title,
          location: block.location,
          startsAtLocal: block.startsAtLocal,
          endsAtLocal: block.endsAtLocal,
          spansNextDay: block.spansNextDay,
          sortOrder: block.sortOrder
        })),
        pauses: nextPauses,
        overrideDays: nextOverrideDays.map((overrideDay) => ({
          overrideDate: overrideDay.overrideDate,
          notes: overrideDay.notes,
          blocks: overrideDay.blocks.map((block, index) => ({
            templateId: block.templateId ?? null,
            title: block.title,
            location: block.location,
            startsAtLocal: block.startsAtLocal,
            endsAtLocal: block.endsAtLocal,
            spansNextDay: block.spansNextDay,
            sortOrder: index
          }))
        }))
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setErrorText(payload?.error ?? t("schedules.exceptionSaveError", "Failed to save schedule exceptions"));
      setIsSaving(false);
      return false;
    }

    setPauses(nextPauses);
    setOverrideDays(nextOverrideDays);
    setIsSaving(false);
    router.refresh();
    return true;
  }

  async function addPause() {
    const nextPauses = [...pauses, { ...pauseDraft }];
    const ok = await persist(nextPauses, overrideDays);
    if (ok) {
      setPauseDraft({
        startOn: schedule.startsOn,
        endOn: schedule.startsOn,
        reason: ""
      });
    }
  }

  async function removePause(index: number) {
    await persist(pauses.filter((_, currentIndex) => currentIndex !== index), overrideDays);
  }

  async function addOverrideDay() {
    const nextOverrideDays = [
      ...overrideDays.filter((overrideDay) => overrideDay.overrideDate !== overrideDraft.overrideDate),
      {
        ...overrideDraft,
        blocks: overrideDraft.blocks.map((block, index) => ({
          ...block,
          sortOrder: index,
          startsAtLocal: block.startsAtLocal.length === 5 ? `${block.startsAtLocal}:00` : block.startsAtLocal,
          endsAtLocal: block.endsAtLocal.length === 5 ? `${block.endsAtLocal}:00` : block.endsAtLocal
        }))
      }
    ].sort((left, right) => left.overrideDate.localeCompare(right.overrideDate));

    const ok = await persist(pauses, nextOverrideDays);
    if (ok) {
      setOverrideDraft(emptyOverrideDay());
    }
  }

  async function removeOverrideDay(index: number) {
    await persist(pauses, overrideDays.filter((_, currentIndex) => currentIndex !== index));
  }

  function applyTemplateToOverrideBlock(index: number, templateId: string) {
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) {
      return;
    }

    setOverrideDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block, blockIndex) =>
        blockIndex === index
          ? {
              ...block,
              templateId: template.id,
              title: template.title,
              location: template.location ?? "",
              startsAtLocal: template.startsAtLocal.slice(0, 5),
              endsAtLocal: template.endsAtLocal.slice(0, 5),
              spansNextDay: template.spansNextDay
            }
          : block
      )
    }));
  }

  return (
    <div className="loom-stack-sm">
      <section className="loom-card p-4">
        <div className="loom-row-between">
          <div>
            <h3 className="loom-section-title">{t("schedules.pausesTitle", "Pauses and breaks")}</h3>
            <p className="loom-muted small m-0">
              {t("schedules.pausesHint", "Use pauses for school breaks, holidays, or periods where the repeating schedule should stop temporarily.")}
            </p>
          </div>
          {isSaving ? <span className="loom-home-pill is-muted m-0">{t("common.saving", "Saving...")}</span> : null}
        </div>

        <div className="loom-stack-sm mt-3">
          {pauses.length === 0 ? <p className="loom-muted">{t("schedules.noPauses", "No pauses added yet.")}</p> : null}
          {pauses.map((pause, index) => (
            <article key={`${pause.startOn}-${pause.endOn}-${index}`} className="loom-row-between">
              <div>
                <p className="m-0 font-semibold">{pause.startOn} - {pause.endOn}</p>
                <p className="loom-muted small m-0">{pause.reason ?? t("common.noDescription", "No description")}</p>
              </div>
              <button type="button" className="loom-button-ghost" onClick={() => removePause(index)} disabled={isSaving}>
                {t("common.remove", "Remove")}
              </button>
            </article>
          ))}
        </div>

        <div className="loom-form-inline mt-4">
          <label className="loom-field">
            <span>{t("schedules.pauseStarts", "Pause starts")}</span>
            <input className="loom-input" type="date" value={pauseDraft.startOn} onChange={(event) => setPauseDraft((current) => ({ ...current, startOn: event.target.value }))} />
          </label>
          <label className="loom-field">
            <span>{t("schedules.pauseEnds", "Pause ends")}</span>
            <input className="loom-input" type="date" value={pauseDraft.endOn} onChange={(event) => setPauseDraft((current) => ({ ...current, endOn: event.target.value }))} />
          </label>
          <label className="loom-field">
            <span>{t("common.reason", "Reason")}</span>
            <input className="loom-input" value={pauseDraft.reason} onChange={(event) => setPauseDraft((current) => ({ ...current, reason: event.target.value }))} />
          </label>
        </div>
        <button type="button" className="loom-button-primary" onClick={addPause} disabled={isSaving}>
          {t("schedules.addPause", "Add pause")}
        </button>
      </section>

      <section className="loom-card p-4">
        <h3 className="loom-section-title">{t("schedules.overrideTitle", "One-off day overrides")}</h3>
        <p className="loom-muted small m-0">
          {t("schedules.overrideHint", "Use an override when one day needs a different location, different hours, or no schedule at all. Leave the block list empty to cancel the day.")}
        </p>

        <div className="loom-stack-sm mt-3">
          {overrideDays.length === 0 ? <p className="loom-muted">{t("schedules.noOverrides", "No override days added yet.")}</p> : null}
          {overrideDays.map((overrideDay, index) => (
            <article key={`${overrideDay.overrideDate}-${index}`} className="loom-card p-3">
              <div className="loom-row-between">
                <div>
                  <p className="m-0 font-semibold">{overrideDay.overrideDate}</p>
                  <p className="loom-muted small m-0">{overrideDay.notes ?? t("common.noDescription", "No description")}</p>
                </div>
                <button type="button" className="loom-button-ghost" onClick={() => removeOverrideDay(index)} disabled={isSaving}>
                  {t("common.remove", "Remove")}
                </button>
              </div>
              <div className="loom-stack-xs mt-2">
                {overrideDay.blocks.length === 0 ? (
                  <p className="loom-muted small m-0">{t("schedules.overrideEmpty", "No blocks for this day. The schedule is cancelled on this date.")}</p>
                ) : (
                  overrideDay.blocks.map((block, blockIndex) => (
                    <p key={`${overrideDay.overrideDate}-${blockIndex}`} className="loom-muted small m-0">
                      {block.title}: {block.startsAtLocal.slice(0, 5)} - {block.endsAtLocal.slice(0, 5)}
                      {block.spansNextDay ? ` ${t("schedules.nextDayShort", "(next day)")}` : ""}
                      {block.location ? ` · ${block.location}` : ""}
                    </p>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>

        <article className="loom-card p-4 mt-4">
          <label className="loom-field">
            <span>{t("schedules.overrideDate", "Override date")}</span>
            <input className="loom-input" type="date" value={overrideDraft.overrideDate} onChange={(event) => setOverrideDraft((current) => ({ ...current, overrideDate: event.target.value }))} />
          </label>
          <label className="loom-field">
            <span>{t("common.notes", "Notes")}</span>
            <input className="loom-input" value={overrideDraft.notes ?? ""} onChange={(event) => setOverrideDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <div className="loom-stack-sm">
            {overrideDraft.blocks.map((block, index) => (
              <div key={`draft-block-${index}`} className="loom-card p-3">
                <div className="loom-row-between">
                  <strong>{t("schedules.blockN", "Block")} {index + 1}</strong>
                  {overrideDraft.blocks.length > 1 ? (
                    <button
                      type="button"
                      className="loom-button-ghost"
                      onClick={() =>
                        setOverrideDraft((current) => ({
                          ...current,
                          blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index)
                        }))
                      }
                    >
                      {t("common.remove", "Remove")}
                    </button>
                  ) : null}
                </div>
                <div className="loom-form-inline mt-3">
                  <label className="loom-field">
                    <span>{t("schedules.template", "Template")}</span>
                    <select className="loom-input" value={block.templateId ?? ""} onChange={(event) => applyTemplateToOverrideBlock(index, event.target.value)}>
                      <option value="">{t("schedules.noTemplate", "No template")}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="loom-field">
                    <span>{t("common.title", "Title")}</span>
                    <input
                      className="loom-input"
                      value={block.title}
                      onChange={(event) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          blocks: current.blocks.map((currentBlock, blockIndex) => blockIndex === index ? { ...currentBlock, title: event.target.value } : currentBlock)
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="loom-form-inline">
                  <label className="loom-field">
                    <span>{t("common.location", "Location")}</span>
                    <input
                      className="loom-input"
                      value={block.location ?? ""}
                      onChange={(event) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          blocks: current.blocks.map((currentBlock, blockIndex) => blockIndex === index ? { ...currentBlock, location: event.target.value } : currentBlock)
                        }))
                      }
                    />
                  </label>
                  <label className="loom-field">
                    <span>{t("schedules.startsAt", "Starts at")}</span>
                    <input
                      className="loom-input"
                      type="time"
                      value={block.startsAtLocal}
                      onChange={(event) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          blocks: current.blocks.map((currentBlock, blockIndex) => blockIndex === index ? { ...currentBlock, startsAtLocal: event.target.value } : currentBlock)
                        }))
                      }
                    />
                  </label>
                  <label className="loom-field">
                    <span>{t("schedules.endsAt", "Ends at")}</span>
                    <input
                      className="loom-input"
                      type="time"
                      value={block.endsAtLocal}
                      onChange={(event) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          blocks: current.blocks.map((currentBlock, blockIndex) => blockIndex === index ? { ...currentBlock, endsAtLocal: event.target.value } : currentBlock)
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="loom-checkbox">
                  <input
                    type="checkbox"
                    checked={block.spansNextDay}
                    onChange={(event) =>
                      setOverrideDraft((current) => ({
                        ...current,
                        blocks: current.blocks.map((currentBlock, blockIndex) => blockIndex === index ? { ...currentBlock, spansNextDay: event.target.checked } : currentBlock)
                      }))
                    }
                  />
                  <span>{t("schedules.crossesMidnight", "Ends on the next day")}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="loom-inline-actions mt-3">
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() =>
                setOverrideDraft((current) => ({
                  ...current,
                  blocks: [...current.blocks, { ...emptyOverrideBlock(), sortOrder: current.blocks.length }]
                }))
              }
            >
              {t("schedules.addBlock", "Add block")}
            </button>
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() => setOverrideDraft((current) => ({ ...current, blocks: [] }))}
            >
              {t("schedules.clearBlocks", "Clear blocks")}
            </button>
          </div>

          <button type="button" className="loom-button-primary mt-3" onClick={addOverrideDay} disabled={isSaving}>
            {t("schedules.saveOverrideDay", "Save override day")}
          </button>
        </article>
      </section>

      {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
    </div>
  );
}
