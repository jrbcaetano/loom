import { redirect } from "next/navigation";

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;
  redirect(`/calendar?item=${encodeURIComponent(eventId)}`);
}
