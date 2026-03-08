import { NextResponse } from "next/server";
import { createRecipe, getRecipes } from "@/features/meals/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) return NextResponse.json({ error: "familyId is required" }, { status: 400 });

  try {
    const recipes = await getRecipes(familyId);
    return NextResponse.json({ recipes });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load recipes" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recipeId = await createRecipe(body);
    return NextResponse.json({ recipeId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create recipe" }, { status: 400 });
  }
}
