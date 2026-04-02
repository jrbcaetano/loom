"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const recipeFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional(),
  instructions: z.string().trim().max(10000).optional(),
  ingredients: z.array(
    z.object({
      name: z.string().trim().min(1).max(180),
      quantity: z.string().trim().max(120).optional(),
      unit: z.string().trim().max(40).optional()
    })
  )
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export function RecipeForm({
  familyId,
  endpoint,
  method,
  redirectTo,
  submitLabel,
  initialValues,
  disableRedirect,
  onSaved
}: {
  familyId: string;
  endpoint: string;
  method: "POST" | "PATCH";
  redirectTo: string;
  submitLabel: string;
  initialValues?: Partial<RecipeFormValues>;
  disableRedirect?: boolean;
  onSaved?: (payload: { recipeId?: string }) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      instructions: initialValues?.instructions ?? "",
      ingredients:
        initialValues?.ingredients && initialValues.ingredients.length > 0
          ? initialValues.ingredients
          : [{ name: "", quantity: "", unit: "" }]
    }
  });

  const ingredients = useFieldArray({ control: form.control, name: "ingredients" });

  async function onSubmit(values: RecipeFormValues) {
    setServerError(null);
    setIsLoading(true);
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        description: values.description || null,
        instructions: values.instructions || null,
        ingredients: values.ingredients.filter((ingredient) => ingredient.name.trim().length > 0)
      })
    });

    const payload = (await response.json().catch(() => null)) as { recipeId?: string; error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("recipes.saveError", "Failed to save recipe"));
      setIsLoading(false);
      return;
    }

    if (disableRedirect) {
      setIsLoading(false);
      onSaved?.({ recipeId: payload?.recipeId });
      router.refresh();
      return;
    }

    const next = payload?.recipeId ? `/meals/recipes/${payload.recipeId}` : redirectTo;
    router.push(next);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("common.title", "Title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>
      <label className="loom-field">
        <span>{t("common.description", "Description")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>
      <label className="loom-field">
        <span>{t("recipes.instructions", "Instructions")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("instructions")} />
      </label>

      <div className="loom-stack-sm">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("recipes.ingredients", "Ingredients")}</h3>
          <button type="button" className="loom-button-ghost" onClick={() => ingredients.append({ name: "", quantity: "", unit: "" })}>
            {t("recipes.addIngredient", "Add ingredient")}
          </button>
        </div>
        {ingredients.fields.map((field, index) => (
          <div key={field.id} className="loom-card soft p-3">
            <div className="loom-form-inline">
              <label className="loom-field">
                <span>{t("common.name", "Name")}</span>
                <input className="loom-input" type="text" {...form.register(`ingredients.${index}.name`)} />
              </label>
              <label className="loom-field">
                <span>{t("lists.form.quantity", "Quantity")}</span>
                <input className="loom-input" type="text" {...form.register(`ingredients.${index}.quantity`)} />
              </label>
              <label className="loom-field">
                <span>{t("recipes.unit", "Unit")}</span>
                <input className="loom-input" type="text" {...form.register(`ingredients.${index}.unit`)} />
              </label>
            </div>
            {ingredients.fields.length > 1 ? (
              <button type="button" className="loom-button-ghost mt-3" onClick={() => ingredients.remove(index)}>
                {t("common.remove", "Remove")}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
