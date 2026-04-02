import { redirect } from "next/navigation";

export default async function NewDocumentPage() {
  redirect("/documents?create=document");
}

