"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

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
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["notes", familyId, search],
    queryFn: () => fetchNotes(familyId, search)
  });

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <label className="loom-field">
          <span>Search</span>
          <input className="loom-input" type="search" placeholder="Search notes by title" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Notes</h2>
        {query.isPending ? <p className="loom-muted mt-3">Loading notes...</p> : null}
        {query.error ? <p className="loom-feedback-error mt-3">{query.error.message}</p> : null}
        <div className="loom-stack-sm mt-3">
          {(query.data ?? []).map((note) => (
            <article key={note.id} className="loom-card soft p-4">
              <Link href={`/notes/${note.id}`} className="loom-link-strong">
                {note.title}
              </Link>
              <p className="loom-muted small mt-1">{note.category ?? "Uncategorized"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
