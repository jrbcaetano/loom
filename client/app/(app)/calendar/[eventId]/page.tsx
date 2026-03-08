import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/server";
import { getFamilyMembers } from "@/features/families/server";
import { EventForm } from "@/features/events/event-form";
import { VisibilityBadge } from "@/components/common/visibility-badge";

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
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const members = (await getFamilyMembers(event.familyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{event.title}</h2>
            <p className="loom-muted mt-1">
              {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
            </p>
            {event.location ? <p className="loom-muted small mt-1">{event.location}</p> : null}
          </div>
          <VisibilityBadge visibility={event.visibility} />
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">Event settings</h3>
          <Link href={`/calendar/${event.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close" : "Edit"}
          </Link>
        </div>

        {query.edit === "1" ? (
          <div className="mt-4">
            <EventForm
              familyId={event.familyId}
              members={members}
              endpoint={`/api/events/${event.id}`}
              method="PATCH"
              submitLabel="Save event"
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
