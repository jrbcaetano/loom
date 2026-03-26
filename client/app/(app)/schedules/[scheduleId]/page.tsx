import Link from "next/link";
import { addDays } from "date-fns";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFamilyMembers } from "@/features/families/server";
import { getServerI18n } from "@/lib/i18n/server";
import { DeleteButton } from "@/components/common/delete-button";
import { ScheduleExceptionsManager } from "@/features/schedules/schedule-exceptions-manager";
import { ScheduleForm } from "@/features/schedules/schedule-form";
import { expandScheduleOccurrences } from "@/features/schedules/occurrences";
import { getScheduleById, getScheduleTemplates } from "@/features/schedules/server";

type ScheduleDetailPageProps = {
  params: Promise<{ scheduleId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ScheduleDetailPage({ params, searchParams }: ScheduleDetailPageProps) {
  await requireUser();
  const { t, dateLocale } = await getServerI18n();
  const { scheduleId } = await params;
  const query = await searchParams;
  const schedule = await getScheduleById(scheduleId);

  if (!schedule) {
    notFound();
  }

  const [members, templates] = await Promise.all([
    getFamilyMembers(schedule.familyId),
    getScheduleTemplates(schedule.familyId)
  ]);

  const upcomingOccurrences = expandScheduleOccurrences(schedule, new Date(), addDays(new Date(), 20));

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{schedule.title}</h2>
          <p className="loom-module-subtitle">
            {schedule.familyMemberName} · {t(`schedules.categoryLabel.${schedule.category}`, schedule.category)}
          </p>
        </div>
        <div className="loom-inline-actions">
          <Link href={`/schedules/${schedule.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
            {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("common.edit", "Edit")}
          </Link>
          <DeleteButton endpoint={`/api/schedules/${schedule.id}`} redirectTo="/schedules" label={t("common.archive", "Archive")} />
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-info-grid">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("schedules.forMember", "For family member")}</p>
            <p className="loom-info-value">{schedule.familyMemberName}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("schedules.cycleLengthWeeks", "Cycle length (weeks)")}</p>
            <p className="loom-info-value">{schedule.cycleLengthWeeks}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("schedules.dateRange", "Date range")}</p>
            <p className="loom-info-value">{schedule.startsOn}{schedule.endsOn ? ` - ${schedule.endsOn}` : ` - ${t("schedules.untilStopped", "until stopped")}`}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.location", "Location")}</p>
            <p className="loom-info-value">{schedule.location ?? t("common.notSet", "Not set")}</p>
          </article>
        </div>
        {schedule.notes ? <p className="loom-muted mt-4 mb-0">{schedule.notes}</p> : null}
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <ScheduleForm
            familyId={schedule.familyId}
            familyMembers={members.map((member) => ({
              id: member.id,
              displayName: member.fullName ?? member.email ?? t("common.member", "Member"),
              role: member.role
            }))}
            templates={templates}
            endpoint={`/api/schedules/${schedule.id}`}
            method="PATCH"
            submitLabel={t("common.save", "Save")}
            redirectTo={`/schedules/${schedule.id}`}
            initialValues={{
              familyMemberId: schedule.familyMemberId,
              title: schedule.title,
              category: schedule.category,
              location: schedule.location ?? "",
              notes: schedule.notes ?? "",
              startsOn: schedule.startsOn,
              endsOn: schedule.endsOn ?? "",
              cycleLengthWeeks: schedule.cycleLengthWeeks,
              isEnabled: schedule.isEnabled,
              blocks: schedule.blocks.map((block) => ({
                templateId: block.templateId,
                weekIndex: block.weekIndex,
                weekday: block.weekday,
                title: block.title,
                location: block.location ?? "",
                startsAtLocal: block.startsAtLocal.slice(0, 5),
                endsAtLocal: block.endsAtLocal.slice(0, 5),
                spansNextDay: block.spansNextDay,
                sortOrder: block.sortOrder
              })),
              pauses: schedule.pauses.map((pause) => ({
                startOn: pause.startOn,
                endOn: pause.endOn,
                reason: pause.reason ?? ""
              })),
              overrideDays: schedule.overrideDays.map((overrideDay) => ({
                overrideDate: overrideDay.overrideDate,
                notes: overrideDay.notes ?? "",
                blocks: overrideDay.blocks.map((block) => ({
                  templateId: block.templateId,
                  title: block.title,
                  location: block.location ?? "",
                  startsAtLocal: block.startsAtLocal.slice(0, 5),
                  endsAtLocal: block.endsAtLocal.slice(0, 5),
                  spansNextDay: block.spansNextDay,
                  sortOrder: block.sortOrder
                }))
              }))
            }}
          />
        </section>
      ) : null}

      <section className="loom-card p-5">
        <h3 className="loom-section-title">{t("schedules.upcomingForSchedule", "Upcoming blocks")}</h3>
        <div className="loom-stack-sm mt-4">
          {upcomingOccurrences.length === 0 ? <p className="loom-muted">{t("schedules.noUpcomingForSchedule", "No upcoming blocks for this schedule.")}</p> : null}
          {upcomingOccurrences.map((occurrence) => (
            <article key={occurrence.id} className="loom-conversation-row">
              <div>
                <p className="m-0 font-semibold">{occurrence.title}</p>
                <p className="loom-muted small m-0">
                  {new Date(`${occurrence.occurrenceDate}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "long", month: "short", day: "numeric" })} · {occurrence.startsAtLocal.slice(0, 5)} - {occurrence.endsAtLocal.slice(0, 5)}
                  {occurrence.spansNextDay ? ` ${t("schedules.nextDayShort", "(next day)")}` : ""}
                  {occurrence.location ? ` · ${occurrence.location}` : ""}
                </p>
              </div>
              <p className="loom-home-pill is-muted m-0">{occurrence.source === "override" ? t("schedules.overrideSource", "Override") : t("schedules.baseSource", "Repeating")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="loom-card p-5">
        <ScheduleExceptionsManager schedule={schedule} templates={templates} />
      </section>
    </div>
  );
}
