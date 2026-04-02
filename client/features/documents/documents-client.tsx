"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry } from "@/features/entities/entity-detail-registry";
import { DocumentDetailPanel } from "@/features/documents/document-detail-panel";
import { DocumentForm } from "@/features/documents/document-form";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

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

export function DocumentsClient({ familyId, initialDocuments = [] }: { familyId: string; initialDocuments?: DocumentRow[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const { routeState, updateRouteState, openItem, clearItem, clearCreate } = useCollectionRouteState();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["documents", familyId, search],
    queryFn: () => fetchDocuments(familyId, search),
    initialData: search.trim().length === 0 ? initialDocuments : undefined
  });

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "document",
      Component: DocumentDetailPanel
    }
  ];

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
                <button type="button" className="loom-link-button loom-link-strong" onClick={() => openItem(document.id)}>
                  {document.title}
                </button>
                <p className="loom-entity-meta">{document.category ?? t("common.uncategorized", "Uncategorized")}</p>
              </div>
              <div className="loom-inline-actions">
                {document.file_url ? <span className="loom-badge">{t("documents.attachment", "Attachment")}</span> : null}
                <p className="loom-muted small">{new Date(document.created_at).toLocaleDateString(dateLocale)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CreateEntityModal
        isOpen={routeState.create === "document"}
        title={t("documents.createTitle", "Create document")}
        eyebrow={t("nav.documents", "Documents")}
        subtitle={t("documents.createSubtitle", "Store key records and optional file links for your family.")}
        onClose={() => clearCreate()}
      >
        <DocumentForm
          familyId={familyId}
          endpoint="/api/documents"
          method="POST"
          submitLabel={t("documents.createTitle", "Create document")}
          redirectTo="/documents"
          disableRedirect
          onSaved={({ documentId }) => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            clearCreate();
            if (documentId) {
              openItem(documentId);
            }
          }}
        />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry
        routeState={routeState}
        entries={detailRegistry}
        close={() => clearItem()}
        updateRouteState={updateRouteState}
      />
    </div>
  );
}

