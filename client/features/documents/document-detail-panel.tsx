"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityActivityStream } from "@/components/patterns/entity-activity-stream";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { buildLifecycleActivityEntries } from "@/features/entities/entity-activity-adapters";
import { DocumentForm } from "@/features/documents/document-form";
import { useI18n } from "@/lib/i18n/context";

type DocumentDetail = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string | null;
  created_at: string;
};

async function fetchDocument(documentId: string) {
  const response = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });
  const payload = (await response.json()) as { document?: DocumentDetail | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load document");
  }
  return payload.document ?? null;
}

export function DocumentDetailPanel({
  itemId,
  routeState,
  close,
  updateRouteState
}: EntityDetailRegistryEntryProps) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";

  const documentQuery = useQuery({
    queryKey: ["document-detail", itemId],
    queryFn: () => fetchDocument(itemId)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete document");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      close();
    }
  });

  const document = documentQuery.data;
  const lifecycleEntries = document
    ? buildLifecycleActivityEntries({
        entityName: t("documents.detailTitle", "Document"),
        createdAt: document.created_at,
        updatedAt: document.created_at,
        authorName: t("common.system", "System")
      })
    : [];

  return (
    <EntityDetailShell
      isOpen
      title={document?.title ?? t("documents.detailTitle", "Document")}
      eyebrow={t("nav.documents", "Documents")}
      subtitle={
        document ? (
          <>
            {document.category ?? t("common.uncategorized", "Uncategorized")} · {new Date(document.created_at).toLocaleDateString(dateLocale)}
          </>
        ) : undefined
      }
      badge={document?.file_url ? <span className="loom-home-pill is-muted m-0">{t("documents.attachment", "Attachment")}</span> : undefined}
      summaryMeta={
        document ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("common.category", "Category")} value={document.category ?? t("common.uncategorized", "Uncategorized")} />
            <EntitySummaryMetaItem label={t("documents.attachment", "Attachment")} value={document.file_url ? t("common.available", "Available") : t("common.none", "None")} />
            <EntitySummaryMetaItem label={t("common.created", "Created")} value={new Date(document.created_at).toLocaleDateString(dateLocale)} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        document ? (
          <div className="loom-inline-actions">
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}
            >
              {isEditing ? t("common.cancel", "Cancel") : t("documents.edit", "Edit document")}
            </button>
          </div>
        ) : undefined
      }
    >
      {documentQuery.isPending ? <EntityDrawerLoadingState message={t("common.loading", "Loading...")} /> : null}
      {documentQuery.error ? <EntityDrawerErrorState message={documentQuery.error.message} /> : null}
      {!documentQuery.isPending && !documentQuery.error && !document ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}

      {document ? (
        <>
          <EntitySection
            title={t("common.details", "Details")}
            actions={
              document.file_url ? (
                <a className="loom-subtle-link" href={document.file_url} target="_blank" rel="noreferrer">
                  {t("documents.openAttachment", "Open attachment")}
                </a>
              ) : undefined
            }
          >
            <EntityMetadataGrid>
              <EntityMetadataItem
                label={t("common.category", "Category")}
                value={document.category ?? t("common.uncategorized", "Uncategorized")}
              />
              <EntityMetadataItem
                label={t("documents.attachment", "Attachment")}
                value={document.file_url ? t("common.available", "Available") : t("common.none", "None")}
              />
              <EntityMetadataItem
                label={t("common.created", "Created")}
                value={new Date(document.created_at).toLocaleString(dateLocale)}
              />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("common.description", "Description")}>
            <p className="m-0">{document.description ?? t("documents.noDescription", "No description.")}</p>
          </EntitySection>

          <EntitySection title={t("common.activity", "Activity")}>
            <EntityActivityStream
              entries={lifecycleEntries}
              dateLocale={dateLocale}
              emptyState={<p className="loom-muted m-0">{t("tasks.noActivity", "No activity yet.")}</p>}
              countLabel={<span className="loom-home-pill is-muted">{lifecycleEntries.length}</span>}
            />
          </EntitySection>

          {isEditing ? (
            <EntitySection title={t("documents.edit", "Edit document")}>
              <DocumentForm
                familyId={document.family_id}
                endpoint={`/api/documents/${document.id}`}
                method="PATCH"
                submitLabel={t("documents.save", "Save document")}
                redirectTo="/documents"
                disableRedirect
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["documents"] });
                  queryClient.invalidateQueries({ queryKey: ["document-detail", document.id] });
                  updateRouteState({ panel: null });
                }}
                initialValues={{
                  title: document.title,
                  description: document.description ?? "",
                  category: document.category ?? "",
                  fileUrl: document.file_url ?? ""
                }}
              />
              <div className="mt-4">
                <button
                  type="button"
                  className="loom-button-ghost loom-signout-danger"
                  onClick={() => {
                    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) {
                      return;
                    }
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("documents.delete", "Delete document")}
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

