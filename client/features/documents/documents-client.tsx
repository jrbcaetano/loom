"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

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
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["documents", familyId, search],
    queryFn: () => fetchDocuments(familyId, search)
  });

  return (
    <div className="loom-stack">
      <section className="loom-card loom-filter-card">
        <div className="loom-filter-row">
          <label className="loom-field">
            <span>{t("common.search", "Search")}</span>
            <input className="loom-input" type="search" placeholder={t("documents.searchPlaceholder", "Search documents by title")} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="loom-card">
        {query.isPending ? <p className="loom-muted mt-3">{t("documents.loading", "Loading documents...")}</p> : null}
        {query.error ? <p className="loom-feedback-error mt-3">{query.error.message}</p> : null}
        <div className="loom-entity-list p-3">
          {(query.data ?? []).map((document) => (
            <article key={document.id} className="loom-conversation-row">
              <div>
                <Link href={`/documents/${document.id}`} className="loom-link-strong">
                  {document.title}
                </Link>
                <p className="loom-entity-meta">{document.category ?? t("common.uncategorized", "Uncategorized")}</p>
              </div>
              <div className="loom-inline-actions">
                {document.file_url ? <span className="loom-badge">{t("documents.attachment", "Attachment")}</span> : null}
                <p className="loom-muted small">{new Date(document.created_at).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
