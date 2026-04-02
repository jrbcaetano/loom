import { redirect } from "next/navigation";

export default async function NewRecipePage() {
  redirect("/meals/recipes?create=recipe");
}
