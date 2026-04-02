import { redirect } from "next/navigation";

type NoteDetailPageProps = {
  params: Promise<{ noteId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function NoteDetailPage({ params, searchParams }: NoteDetailPageProps) {
  const { noteId } = await params;
  const query = await searchParams;
  const panel = query.edit === "1" ? "&panel=edit" : "";
  redirect(`/notes?item=${encodeURIComponent(noteId)}${panel}`);
}
