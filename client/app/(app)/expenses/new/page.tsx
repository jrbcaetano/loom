import { redirect } from "next/navigation";

export default async function NewExpensePage() {
  redirect("/expenses?create=expense");
}

