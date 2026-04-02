import { redirect } from "next/navigation";

type ChoreDetailPageProps = {
  params: Promise<{ choreId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ChoreDetailPage({ params, searchParams }: ChoreDetailPageProps) {
  const { choreId } = await params;
  const query = await searchParams;
  const panel = query.edit === "1" ? "&panel=edit" : "";
  redirect(`/chores?item=${encodeURIComponent(choreId)}${panel}`);
}
