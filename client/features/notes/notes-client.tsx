"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

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

export function NotesClient({ familyId }: { familyId: string }) {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "shared" | "private">("all");

  const query = useQuery({
    queryKey: ["notes", familyId, search],
    queryFn: () => fetchNotes(familyId, search)
  });

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    if (scope === "all") return items;
    if (scope === "shared") return items.filter((note) => (note.category ?? "").toLowerCase() !== "private");
    return items.filter((note) => (note.category ?? "").toLowerCase() === "private");
  }, [query.data, scope]);

  return (
    <div className="loom-stack">
      <section className="loom-card loom-filter-card">
        <div className="loom-filter-row">
          <label className="loom-field">
            <span>{t("common.search", "Search")}</span>
            <input className="loom-input" type="search" placeholder={t("notes.searchPlaceholder", "Search notes")} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        <div className="loom-inline-actions mt-3">
          <button className={`loom-task-tab ${scope === "all" ? "is-active" : ""}`} type="button" onClick={() => setScope("all")}>{t("tasks.filterAll", "All")}</button>
          <button className={`loom-task-tab ${scope === "shared" ? "is-active" : ""}`} type="button" onClick={() => setScope("shared")}>{t("common.shared", "Shared")}</button>
          <button className={`loom-task-tab ${scope === "private" ? "is-active" : ""}`} type="button" onClick={() => setScope("private")}>{t("visibility.private", "Private")}</button>
        </div>
      </section>

      {query.isPending ? <p className="loom-muted">{t("notes.loading", "Loading notes...")}</p> : null}
      {query.error ? <p className="loom-feedback-error">{query.error.message}</p> : null}

      <section className="loom-grid-2">
        {filtered.map((note) => (
          <article key={note.id} className="loom-card p-4">
            <div className="loom-row-between">
              <div>
                <Link href={`/notes/${note.id}`} className="loom-link-strong">
                  {note.title}
                </Link>
                <p className="loom-entity-meta">{note.category ?? t("notes.general", "General")}</p>
              </div>
              <span className="loom-home-pill is-muted">{(note.category ?? "").toLowerCase() === "private" ? t("visibility.private", "Private") : t("common.shared", "Shared")}</span>
            </div>
            <p className="loom-muted small mt-3">{note.content.slice(0, 120)}{note.content.length > 120 ? "..." : ""}</p>
            <p className="loom-muted small mt-3">{t("common.updated", "Updated")} {new Date(note.updated_at).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US")}</p>
          </article>
        ))}
        {filtered.length === 0 && !query.isPending ? <p className="loom-muted">{t("notes.none", "No notes found.")}</p> : null}
      </section>
    </div>
  );
}
