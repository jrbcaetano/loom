"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityActivityStream } from "@/components/patterns/entity-activity-stream";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityAssigneeBadge, EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import { buildLifecycleActivityEntries } from "@/features/entities/entity-activity-adapters";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { RoutineForm } from "@/features/routines/routine-form";
import { useI18n } from "@/lib/i18n/context";

type RoutineStep = { id: string; text: string; sort_order: number };
type RoutineLog = { id: string; user_id: string; completed_at: string };
type RoutineDetail = {
  id: string;
  family_id: string;
  title: string;
  assigned_to_user_id: string | null;
  schedule_type: "daily" | "weekly" | "custom";
  created_at?: string | null;
  steps?: RoutineStep[];
  logs?: RoutineLog[];
};

type MemberOption = { userId: string; displayName: string };

async function fetchRoutine(routineId: string) {
  const response = await fetch(`/api/routines/${routineId}`, { cache: "no-store" });
  const payload = (await response.json()) as { routine?: RoutineDetail | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load routine");
  }
  return payload.routine ?? null;
}

export function RoutineDetailPanel({
  itemId,
  routeState,
  close,
  updateRouteState,
  members
}: EntityDetailRegistryEntryProps & { members: MemberOption[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";

  const routineQuery = useQuery({
    queryKey: ["routine-detail", itemId],
    queryFn: () => fetchRoutine(itemId)
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/routines/${itemId}/complete`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("routines.completeError", "Failed to complete routine"));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      await queryClient.invalidateQueries({ queryKey: ["routine-detail", itemId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/routines/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete routine");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      close();
    }
  });

  const routine = routineQuery.data;
  const assigneeName = members.find((member) => member.userId === routine?.assigned_to_user_id)?.displayName ?? t("tasks.unassigned", "Unassigned");
  const lifecycleEntries = routine
    ? buildLifecycleActivityEntries({
        entityName: t("routines.routine", "Routine"),
        createdAt: routine.created_at ?? new Date().toISOString(),
        updatedAt: routine.logs?.[0]?.completed_at ?? routine.created_at ?? new Date().toISOString(),
        authorName: assigneeName
      })
    : [];

  return (
    <EntityDetailShell
      isOpen
      title={routine?.title ?? t("routines.detailTitle", "Routine")}
      eyebrow={t("nav.routines", "Routines")}
      subtitle={routine ? `${t(`routines.${routine.schedule_type}`, routine.schedule_type)} ${t("routines.routine", "routine")}` : undefined}
      summaryMeta={
        routine ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("routines.schedule", "Schedule")} value={t(`routines.${routine.schedule_type}`, routine.schedule_type)} />
            <EntitySummaryMetaItem label={t("tasks.assignee", "Assignee")} value={assigneeName} />
            <EntitySummaryMetaItem label={t("routines.steps", "steps")} value={routine.steps?.length ?? 0} />
            <EntitySummaryMetaItem label={t("common.updated", "Updated")} value={routine.logs?.[0]?.completed_at ? new Date(routine.logs[0].completed_at).toLocaleDateString(dateLocale) : t("common.none", "None")} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        routine ? (
          <div className="loom-inline-actions">
            <button type="button" className="loom-button-ghost" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              {t("routines.completeNow", "Complete now")}
            </button>
            <button type="button" className="loom-button-ghost" onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}>
              {isEditing ? t("common.cancel", "Cancel") : t("routines.edit", "Edit routine")}
            </button>
          </div>
        ) : undefined
      }
    >
      {routineQuery.isPending ? <EntityDrawerLoadingState message={t("routines.loading", "Loading routines...")} /> : null}
      {routineQuery.error ? <EntityDrawerErrorState message={routineQuery.error.message} /> : null}
      {!routineQuery.isPending && !routineQuery.error && !routine ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}

      {routine ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem label={t("routines.schedule", "Schedule")} value={t(`routines.${routine.schedule_type}`, routine.schedule_type)} />
              <EntityMetadataItem label={t("tasks.assignee", "Assignee")} value={<EntityAssigneeBadge value={assigneeName} />} />
              <EntityMetadataItem label={t("routines.steps", "steps")} value={routine.steps?.length ?? 0} />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("routines.checklistSteps", "Checklist steps")}>
            <div className="loom-stack-sm">
              {(routine.steps ?? []).map((step) => (
                <p key={step.id} className="loom-soft-row m-0">
                  {step.sort_order + 1}. {step.text}
                </p>
              ))}
              {(routine.steps ?? []).length === 0 ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}
            </div>
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
            <EntitySection title={t("routines.edit", "Edit routine")}>
              <RoutineForm
                familyId={routine.family_id}
                members={members}
                endpoint={`/api/routines/${routine.id}`}
                method="PATCH"
                submitLabel={t("routines.save", "Save routine")}
                redirectTo="/routines"
                disableRedirect
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["routines"] });
                  queryClient.invalidateQueries({ queryKey: ["routine-detail", routine.id] });
                  updateRouteState({ panel: null });
                }}
                initialValues={{
                  title: routine.title,
                  assignedToUserId: routine.assigned_to_user_id ?? "",
                  scheduleType: routine.schedule_type,
                  steps: (routine.steps ?? []).map((step) => ({ text: step.text }))
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
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("routines.delete", "Delete routine")}
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
