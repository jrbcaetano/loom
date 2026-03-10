import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/server";
import { getFamilyMembers } from "@/features/families/server";
import { EventForm } from "@/features/events/event-form";
import { VisibilityBadge } from "@/components/common/visibility-badge";
import { getServerI18n } from "@/lib/i18n/server";
import { resolveDateLocale } from "@/lib/date";

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

function formatDateTimeLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { t, locale } = await getServerI18n();
  const dateLocale = resolveDateLocale(locale);
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const members = (await getFamilyMembers(event.familyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }));

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{event.title}</h2>
          <p className="loom-module-subtitle">
            {new Date(event.startAt).toLocaleString(dateLocale)} - {new Date(event.endAt).toLocaleString(dateLocale)}
          </p>
        </div>
        <div className="loom-inline-actions">
          <VisibilityBadge visibility={event.visibility} />
          <Link href={`/calendar/${event.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
            {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("calendar.edit", "Edit event")}
          </Link>
        </div>
      </section>

      <section className="loom-card p-5">
        <h3 className="loom-section-title">{t("calendar.eventDetails", "Event details")}</h3>
        <div className="loom-info-grid mt-3">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("calendar.starts", "Starts")}</p>
            <p className="loom-info-value">{new Date(event.startAt).toLocaleString(dateLocale)}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("calendar.ends", "Ends")}</p>
            <p className="loom-info-value">{new Date(event.endAt).toLocaleString(dateLocale)}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.visibility", "Visibility")}</p>
            <p className="loom-info-value">{event.visibility}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.location", "Location")}</p>
            <p className="loom-info-value">{event.location ?? t("common.notSet", "Not set")}</p>
          </article>
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("calendar.eventSettings", "Event settings")}</h3>
          <p className="loom-home-pill is-muted m-0">{event.allDay ? t("calendar.allDay", "all day") : t("calendar.scheduled", "scheduled")}</p>
        </div>

        {query.edit === "1" ? (
          <div className="mt-4">
            <EventForm
              familyId={event.familyId}
              members={members}
              endpoint={`/api/events/${event.id}`}
              method="PATCH"
              submitLabel={t("calendar.save", "Save event")}
              redirectTo={`/calendar/${event.id}`}
              initialValues={{
                title: event.title,
                description: event.description ?? "",
                startAt: formatDateTimeLocal(event.startAt),
                endAt: formatDateTimeLocal(event.endAt),
                location: event.location ?? "",
                allDay: event.allDay,
                visibility: event.visibility
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
