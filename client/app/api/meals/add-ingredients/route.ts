import { NextResponse } from "next/server";
import { addRecipeIngredientsToList } from "@/features/meals/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recipeId: string; listId: string };
    const count = await addRecipeIngredientsToList(body.recipeId, body.listId);
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to add ingredients" }, { status: 400 });
  }
}
