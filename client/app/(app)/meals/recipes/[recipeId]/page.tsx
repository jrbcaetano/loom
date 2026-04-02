import { redirect } from "next/navigation";

type RecipeDetailPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function RecipeDetailPage({ params, searchParams }: RecipeDetailPageProps) {
  const { recipeId } = await params;
  const query = await searchParams;
  const panel = query.edit === "1" ? "&panel=edit" : "";
  redirect(`/meals/recipes?item=${encodeURIComponent(recipeId)}${panel}`);
}
