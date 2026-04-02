import { redirect } from "next/navigation";

type RoutineDetailPageProps = {
  params: Promise<{ routineId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function RoutineDetailPage({ params, searchParams }: RoutineDetailPageProps) {
  const { routineId } = await params;
  const query = await searchParams;
  const panel = query.edit === "1" ? "&panel=edit" : "";
  redirect(`/routines?item=${encodeURIComponent(routineId)}${panel}`);
}
