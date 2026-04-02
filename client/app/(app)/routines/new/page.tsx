import { redirect } from "next/navigation";

export default async function NewRoutinePage() {
  redirect("/routines?create=routine");
}
