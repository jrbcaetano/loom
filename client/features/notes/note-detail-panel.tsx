"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityActivityStream } from "@/components/patterns/entity-activity-stream";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import { buildLifecycleActivityEntries } from "@/features/entities/entity-activity-adapters";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { NoteForm } from "@/features/notes/note-form";
import { useI18n } from "@/lib/i18n/context";

type NoteDetail = {
  id: string;
  family_id: string;
  title: string;
  content: string;
  category: string | null;
  created_at?: string | null;
  updated_at: string;
};

async function fetchNote(noteId: string) {
  const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
  const payload = (await response.json()) as { note?: NoteDetail | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load note");
  }
  return payload.note ?? null;
}

export function NoteDetailPanel({ itemId, routeState, close, updateRouteState }: EntityDetailRegistryEntryProps) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";

  const noteQuery = useQuery({
    queryKey: ["note-detail", itemId],
    queryFn: () => fetchNote(itemId)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notes/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete note");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
      close();
    }
  });

  const note = noteQuery.data;
  const lifecycleEntries = note
    ? buildLifecycleActivityEntries({
        entityName: t("notes.note", "Note"),
        createdAt: note.created_at ?? note.updated_at,
        updatedAt: note.updated_at,
        authorName: t("common.system", "System")
      })
    : [];

  return (
    <EntityDetailShell
      isOpen
      title={note?.title ?? t("notes.detailTitle", "Note")}
      eyebrow={t("nav.notes", "Notes")}
      subtitle={note ? `${note.category ?? t("notes.general", "General")} · ${note.content.length} ${t("notes.chars", "chars")}` : undefined}
      summaryMeta={
        note ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("common.category", "Category")} value={note.category ?? t("notes.general", "General")} />
            <EntitySummaryMetaItem label={t("notes.length", "Length")} value={`${note.content.length} ${t("notes.chars", "chars")}`} />
            <EntitySummaryMetaItem label={t("common.updated", "Updated")} value={new Date(note.updated_at).toLocaleDateString(dateLocale)} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        note ? (
          <div className="loom-inline-actions">
            <button type="button" className="loom-button-ghost" onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}>
              {isEditing ? t("common.cancel", "Cancel") : t("notes.edit", "Edit note")}
            </button>
          </div>
        ) : undefined
      }
    >
      {noteQuery.isPending ? <EntityDrawerLoadingState message={t("notes.loading", "Loading notes...")} /> : null}
      {noteQuery.error ? <EntityDrawerErrorState message={noteQuery.error.message} /> : null}
      {!noteQuery.isPending && !noteQuery.error && !note ? <EntityDrawerEmptyState message={t("notes.none", "No notes found.")} /> : null}

      {note ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem label={t("common.category", "Category")} value={note.category ?? t("notes.general", "General")} />
              <EntityMetadataItem label={t("notes.length", "Length")} value={`${note.content.length} ${t("notes.chars", "chars")}`} />
              <EntityMetadataItem label={t("common.updated", "Updated")} value={new Date(note.updated_at).toLocaleString(dateLocale)} />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("notes.content", "Content")}>
            <p className="m-0 whitespace-pre-wrap">{note.content}</p>
          </EntitySection>

          <EntitySection title={t("common.activity", "Activity")}>
            <EntityActivityStream
              entries={lifecycleEntries}
              dateLocale={dateLocale}
              emptyState={<EntityDrawerEmptyState message={t("tasks.noActivity", "No activity yet.")} />}
              countLabel={<span className="loom-home-pill is-muted">{lifecycleEntries.length}</span>}
            />
          </EntitySection>

          {isEditing ? (
            <EntitySection title={t("notes.edit", "Edit note")}>
              <NoteForm
                familyId={note.family_id}
                endpoint={`/api/notes/${note.id}`}
                method="PATCH"
                submitLabel={t("notes.save", "Save note")}
                redirectTo="/notes"
                disableRedirect
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["notes"] });
                  queryClient.invalidateQueries({ queryKey: ["note-detail", note.id] });
                  updateRouteState({ panel: null });
                }}
                initialValues={{
                  title: note.title,
                  content: note.content,
                  category: note.category ?? ""
                }}
              />
              <div className="mt-4">
                <button
                  type="button"
                  className="loom-button-ghost loom-signout-danger"
                  onClick={() => {
                    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) return;
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("notes.delete", "Delete note")}
                </button>
                {deleteMutation.error ? <p className="loom-feedback-error mt-2">{deleteMutation.error.message}</p> : null}
              </div>
            </EntitySection>
          ) : null}
        </>
      ) : null}
    </EntityDetailShell>
  );
}

