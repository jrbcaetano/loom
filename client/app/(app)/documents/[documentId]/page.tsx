import { redirect } from "next/navigation";

type DocumentDetailPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function DocumentDetailPage({ params, searchParams }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const query = await searchParams;
  const panel = query.edit === "1" ? "&panel=edit" : "";
  redirect(`/documents?item=${encodeURIComponent(documentId)}${panel}`);
}

