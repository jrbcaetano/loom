import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { redirect } from "next/navigation";

type NewEventPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  const query = await searchParams;
  const selectedDate = typeof query.date === "string" ? query.date : undefined;

  if (!context.activeFamilyId) {
    redirect("/calendar");
  }

  redirect(selectedDate ? `/calendar?create=event&date=${encodeURIComponent(selectedDate)}` : "/calendar?create=event");
}
