import { redirect } from "next/navigation";

export default async function NewChorePage() {
  redirect("/chores?create=chore");
}
