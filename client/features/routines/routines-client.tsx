"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionControls, CollectionControlField } from "@/components/patterns/collection-controls";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry } from "@/features/entities/entity-detail-registry";
import { RoutineDetailPanel } from "@/features/routines/routine-detail-panel";
import { RoutineForm } from "@/features/routines/routine-form";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

type RoutineRow = {
  id: string;
  title: string;
  schedule_type: "daily" | "weekly" | "custom";
  assigned_to_user_id?: string | null;
};

type MemberOption = { userId: string; displayName: string };

async function fetchRoutines(familyId: string) {
  const response = await fetch(`/api/routines?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { routines?: RoutineRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load routines");
  return payload.routines ?? [];
}

export function RoutinesClient({
  familyId,
  members,
  initialRoutines = []
}: {
  familyId: string;
  members: MemberOption[];
  initialRoutines?: RoutineRow[];
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { routeState, updateRouteState, openItem, clearItem, clearCreate } = useCollectionRouteState();
  const [search, setSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | RoutineRow["schedule_type"]>("all");
  const query = useQuery({
    queryKey: ["routines", familyId],
    queryFn: () => fetchRoutines(familyId),
    initialData: initialRoutines
  });

  const completeMutation = useMutation({
    mutationFn: async (routineId: string) => {
      const response = await fetch(`/api/routines/${routineId}/complete`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("routines.completeError", "Failed to complete routine"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines", familyId] });
    }
  });

  const filteredRoutines = useMemo(() => {
    return (query.data ?? []).filter((routine) => {
      const matchesQuery = search.trim().length === 0 || routine.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesSchedule = scheduleFilter === "all" || routine.schedule_type === scheduleFilter;
      return matchesQuery && matchesSchedule;
    });
  }, [query.data, scheduleFilter, search]);

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "routine",
      Component: (props) => <RoutineDetailPanel {...props} members={members} />
    }
  ];

  return (
    <div className="loom-stack">
      <CollectionControls>
        <CollectionControlField>
          <span>{t("common.search", "Search")}</span>
          <input className="loom-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("routines.searchPlaceholder", "Search routines")} />
        </CollectionControlField>
        <CollectionControlField>
          <span>{t("common.filter", "Filter")}</span>
          <select className="loom-input" value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value as typeof scheduleFilter)}>
            <option value="all">{t("tasks.filterAll", "All")}</option>
            <option value="daily">{t("routines.daily", "Daily")}</option>
            <option value="weekly">{t("routines.weekly", "Weekly")}</option>
            <option value="custom">{t("routines.custom", "Custom")}</option>
          </select>
        </CollectionControlField>
      </CollectionControls>

      <section className="loom-card loom-collection-card p-3">
        {query.isPending ? <p className="loom-muted p-4">{t("routines.loading", "Loading routines...")}</p> : null}
        {query.error ? <p className="loom-feedback-error p-4">{query.error.message}</p> : null}
        <div className="loom-stack-sm">
          {filteredRoutines.map((routine) => (
            <article key={routine.id} className="loom-conversation-row">
              <div>
                <button
                  type="button"
                  className="loom-link-button loom-link-strong"
                  aria-label={`${t("routines.openRoutine", "Open routine")}: ${routine.title}`}
                  onClick={() => openItem(routine.id)}
                >
                  {routine.title}
                </button>
                <p className="loom-entity-meta capitalize">{routine.schedule_type}</p>
              </div>
              <button
                className="loom-button-ghost"
                type="button"
                aria-label={`${t("routines.completeNow", "Complete now")}: ${routine.title}`}
                onClick={() => completeMutation.mutate(routine.id)}
              >
                {t("routines.completeNow", "Complete now")}
              </button>
            </article>
          ))}
          {filteredRoutines.length === 0 && !query.isPending ? <p className="loom-muted p-4">{t("common.none", "None")}</p> : null}
        </div>
      </section>

      <CreateEntityModal
        isOpen={routeState.create === "routine"}
        title={t("routines.createTitle", "Create routine")}
        eyebrow={t("nav.routines", "Routines")}
        subtitle={t("routines.createSubtitle", "Build repeatable checklists for daily and weekly habits.")}
        onClose={() => clearCreate()}
      >
        <RoutineForm
          familyId={familyId}
          members={members}
          endpoint="/api/routines"
          method="POST"
          submitLabel={t("routines.createTitle", "Create routine")}
          redirectTo="/routines"
          disableRedirect
          onSaved={({ routineId }) => {
            queryClient.invalidateQueries({ queryKey: ["routines"] });
            clearCreate();
            if (routineId) {
              openItem(routineId);
            }
          }}
        />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
