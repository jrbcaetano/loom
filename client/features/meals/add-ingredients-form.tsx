"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

type ListOption = {
  id: string;
  title: string;
};

export function AddIngredientsForm({ recipeId, lists }: { recipeId: string; lists: ListOption[] }) {
  const { t } = useI18n();
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit() {
    if (!listId) return;
    setErrorText(null);
    setFeedback(null);
    setIsLoading(true);

    const response = await fetch("/api/meals/add-ingredients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipeId, listId })
    });

    const payload = (await response.json()) as { addedCount?: number; error?: string };
    setIsLoading(false);

    if (!response.ok) {
      setErrorText(payload.error ?? t("recipes.addIngredientsError", "Failed to add ingredients"));
      return;
    }

    setFeedback(`${t("recipes.added", "Added")} ${payload.addedCount ?? 0} ${t("recipes.ingredients", "ingredients")} ${t("recipes.toSelectedList", "to the selected list.")}`);
  }

  return (
    <div className="loom-form-inline">
      <label className="loom-field">
        <span>{t("recipes.targetShoppingList", "Target shopping list")}</span>
        <select className="loom-input" value={listId} onChange={(event) => setListId(event.target.value)}>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
      </label>
      <button className="loom-button-primary" type="button" disabled={!listId || isLoading} onClick={onSubmit}>
        {isLoading ? t("recipes.adding", "Adding...") : t("recipes.addIngredients", "Add ingredients")}
      </button>
      {feedback ? <p className="loom-feedback-success">{feedback}</p> : null}
      {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
    </div>
  );
}
