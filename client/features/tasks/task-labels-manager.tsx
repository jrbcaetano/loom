"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";
import type { TaskLabelScope } from "@/features/tasks/model";

type TaskLabelRow = {
  id: string;
  name: string;
  color: string;
  scope: TaskLabelScope;
  userId: string | null;
  familyId: string | null;
};

async function fetchLabels(scope: TaskLabelScope, familyId?: string) {
  const params = new URLSearchParams({ scope });
  if (scope === "family" && familyId) {
    params.set("familyId", familyId);
  }

  const response = await fetch(`/api/task-labels?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { labels: TaskLabelRow[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load labels");
  }

  return payload.labels;
}

export function TaskLabelsManager({ scope, familyId }: { scope: TaskLabelScope; familyId?: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4F46E5");
  const [editing, setEditing] = useState<Record<string, { name: string; color: string }>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const queryKey = ["task-labels", scope, familyId ?? "none"] as const;

  const labelsQuery = useQuery({
    queryKey,
    queryFn: () => fetchLabels(scope, familyId)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/task-labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope,
          familyId: scope === "family" ? familyId : null,
          name: newName,
          color: newColor
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("tasks.labelsSaveError", "Failed to save label"));
      }
    },
    onSuccess: () => {
      setNewName("");
      setNewColor("#4F46E5");
      setServerError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      setServerError(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const response = await fetch(`/api/task-labels/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, color })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("tasks.labelsSaveError", "Failed to save label"));
      }
    },
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      setServerError(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/task-labels/${id}`, {
        method: "DELETE"
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("tasks.labelsDeleteError", "Failed to delete label"));
      }
    },
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      setServerError(error.message);
    }
  });

  return (
    <div className="loom-form-stack">
      <div className="loom-grid-2">
        <label className="loom-field">
          <span>{t("tasks.labelName", "Label name")}</span>
          <input className="loom-input" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} />
        </label>
        <label className="loom-field">
          <span>{t("tasks.labelColor", "Color")}</span>
          <input className="loom-input" type="color" value={newColor} onChange={(event) => setNewColor(event.target.value.toUpperCase())} />
        </label>
      </div>

      <div>
        <button
          className="loom-button-primary"
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!newName.trim() || createMutation.isPending || (scope === "family" && !familyId)}
        >
          {createMutation.isPending ? t("common.saving", "Saving...") : t("tasks.addLabel", "Add label")}
        </button>
      </div>

      {labelsQuery.isPending ? <p className="loom-muted">{t("common.loading", "Loading...")}</p> : null}
      {labelsQuery.error ? <p className="loom-feedback-error">{labelsQuery.error.message}</p> : null}

      <div className="loom-stack-sm">
        {(labelsQuery.data ?? []).map((label) => {
          const draft = editing[label.id] ?? { name: label.name, color: label.color };
          return (
            <div key={label.id} className="loom-soft-row">
              <div className="loom-grid-2">
                <input
                  className="loom-input"
                  value={draft.name}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [label.id]: { ...draft, name: event.target.value }
                    }))
                  }
                />
                <input
                  className="loom-input"
                  type="color"
                  value={draft.color}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [label.id]: { ...draft, color: event.target.value.toUpperCase() }
                    }))
                  }
                />
              </div>

              <div className="loom-inline-actions mt-3">
                <button
                  className="loom-button-ghost"
                  type="button"
                  onClick={() => updateMutation.mutate({ id: label.id, name: draft.name, color: draft.color })}
                  disabled={!draft.name.trim() || updateMutation.isPending}
                >
                  {t("common.save", "Save")}
                </button>
                <button className="loom-button-ghost" type="button" onClick={() => deleteMutation.mutate(label.id)} disabled={deleteMutation.isPending}>
                  {t("common.remove", "Remove")}
                </button>
              </div>
            </div>
          );
        })}

        {!labelsQuery.isPending && (labelsQuery.data ?? []).length === 0 ? (
          <p className="loom-muted m-0">{t("tasks.noLabels", "No labels yet.")}</p>
        ) : null}
      </div>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </div>
  );
}
