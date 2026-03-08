"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string | null;
  created_at: string;
};

async function fetchDocuments(familyId: string, search: string) {
  const params = new URLSearchParams({ familyId });
  if (search.trim()) params.set("search", search.trim());
  const response = await fetch(`/api/documents?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { documents?: DocumentRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load documents");
  return payload.documents ?? [];
}

export function DocumentsClient({ familyId }: { familyId: string }) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["documents", familyId, search],
    queryFn: () => fetchDocuments(familyId, search)
  });

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <label className="loom-field">
          <span>Search</span>
          <input className="loom-input" type="search" placeholder="Search documents by title" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Documents</h2>
        {query.isPending ? <p className="loom-muted mt-3">Loading documents...</p> : null}
        {query.error ? <p className="loom-feedback-error mt-3">{query.error.message}</p> : null}
        <div className="loom-stack-sm mt-3">
          {(query.data ?? []).map((document) => (
            <article key={document.id} className="loom-card soft p-4">
              <Link href={`/documents/${document.id}`} className="loom-link-strong">
                {document.title}
              </Link>
              <p className="loom-muted small mt-1">{document.category ?? "Uncategorized"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
