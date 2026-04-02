import { redirect } from "next/navigation";

export default async function NewNotePage() {
  redirect("/notes?create=note");
}
