import { NextResponse } from "next/server";
import { deleteRecipe, getRecipeById, updateRecipe } from "@/features/meals/server";

type RouteParams = { params: Promise<{ recipeId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { recipeId } = await params;

  try {
    const recipe = await getRecipeById(recipeId);
    return NextResponse.json({ recipe });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load recipe" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { recipeId } = await params;

  try {
    const body = await request.json();
    await updateRecipe(recipeId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update recipe" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { recipeId } = await params;

  try {
    await deleteRecipe(recipeId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete recipe" }, { status: 400 });
  }
}
