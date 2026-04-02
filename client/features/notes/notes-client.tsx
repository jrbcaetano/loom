"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionControls, CollectionControlField, CollectionControlsFooter } from "@/components/patterns/collection-controls";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry } from "@/features/entities/entity-detail-registry";
import { NoteDetailPanel } from "@/features/notes/note-detail-panel";
import { NoteForm } from "@/features/notes/note-form";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

type NoteRow = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  updated_at: string;
};

async function fetchNotes(familyId: string, search: string) {
  const params = new URLSearchParams({ familyId });
  if (search.trim()) params.set("search", search.trim());
  const response = await fetch(`/api/notes?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { notes?: NoteRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load notes");
  return payload.notes ?? [];
}

export function NotesClient({ familyId, initialNotes = [] }: { familyId: string; initialNotes?: NoteRow[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const { routeState, updateRouteState, openItem, clearItem, clearCreate } = useCollectionRouteState();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "shared" | "private">("all");

  const query = useQuery({
    queryKey: ["notes", familyId, search],
    queryFn: () => fetchNotes(familyId, search),
    initialData: search.trim().length === 0 ? initialNotes : undefined
  });

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    if (scope === "all") return items;
    if (scope === "shared") return items.filter((note) => (note.category ?? "").toLowerCase() !== "private");
    return items.filter((note) => (note.category ?? "").toLowerCase() === "private");
  }, [query.data, scope]);

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "note",
      Component: NoteDetailPanel
    }
  ];

  return (
    <div className="loom-stack">
      <CollectionControls>
          <CollectionControlField>
            <span>{t("common.search", "Search")}</span>
            <input className="loom-input" type="search" placeholder={t("notes.searchPlaceholder", "Search notes")} value={search} onChange={(event) => setSearch(event.target.value)} />
          </CollectionControlField>
      </CollectionControls>
      <CollectionControlsFooter>
        <div className="loom-inline-actions">
          <button className={`loom-task-tab ${scope === "all" ? "is-active" : ""}`} type="button" onClick={() => setScope("all")}>{t("tasks.filterAll", "All")}</button>
          <button className={`loom-task-tab ${scope === "shared" ? "is-active" : ""}`} type="button" onClick={() => setScope("shared")}>{t("common.shared", "Shared")}</button>
          <button className={`loom-task-tab ${scope === "private" ? "is-active" : ""}`} type="button" onClick={() => setScope("private")}>{t("visibility.private", "Private")}</button>
        </div>
      </CollectionControlsFooter>

      {query.isPending ? <p className="loom-muted">{t("notes.loading", "Loading notes...")}</p> : null}
      {query.error ? <p className="loom-feedback-error">{query.error.message}</p> : null}

      <section className="loom-grid-2">
        {filtered.map((note) => (
          <article key={note.id} className="loom-card loom-collection-card p-4" aria-label={note.title}>
            <div className="loom-row-between">
              <div>
                <button
                  type="button"
                  className="loom-link-button loom-link-strong"
                  aria-label={`${t("notes.openNote", "Open note")}: ${note.title}`}
                  onClick={() => openItem(note.id)}
                >
                  {note.title}
                </button>
                <p className="loom-entity-meta">{note.category ?? t("notes.general", "General")}</p>
              </div>
              <span className="loom-home-pill is-muted">{(note.category ?? "").toLowerCase() === "private" ? t("visibility.private", "Private") : t("common.shared", "Shared")}</span>
            </div>
            <p className="loom-muted small mt-3">{note.content.slice(0, 120)}{note.content.length > 120 ? "..." : ""}</p>
            <p className="loom-muted small mt-3">{t("common.updated", "Updated")} {new Date(note.updated_at).toLocaleDateString(dateLocale)}</p>
          </article>
        ))}
        {filtered.length === 0 && !query.isPending ? <p className="loom-muted loom-card loom-collection-card p-4">{t("notes.none", "No notes found.")}</p> : null}
      </section>

      <CreateEntityModal
        isOpen={routeState.create === "note"}
        title={t("notes.createTitle", "Create note")}
        eyebrow={t("nav.notes", "Notes")}
        subtitle={t("notes.createSubtitle", "Capture important family information and references.")}
        onClose={() => clearCreate()}
      >
        <NoteForm
          familyId={familyId}
          endpoint="/api/notes"
          method="POST"
          submitLabel={t("notes.createTitle", "Create note")}
          redirectTo="/notes"
          disableRedirect
          onSaved={({ noteId }) => {
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            clearCreate();
            if (noteId) {
              openItem(noteId);
            }
          }}
        />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
