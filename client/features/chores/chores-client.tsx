"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CollectionControls, CollectionControlField } from "@/components/patterns/collection-controls";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry } from "@/features/entities/entity-detail-registry";
import { ChoreDetailPanel } from "@/features/chores/chore-detail-panel";
import { ChoreForm } from "@/features/chores/chore-form";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

type ChoreRow = {
  id: string;
  title: string;
  points: number;
  due_date: string | null;
  status: "todo" | "done";
  assigned_to_user_id: string | null;
};

type MemberOption = {
  userId: string;
  displayName: string;
};

async function fetchChores(familyId: string) {
  const response = await fetch(`/api/chores?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { chores?: ChoreRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load chores");
  return payload.chores ?? [];
}

export function ChoresClient({
  familyId,
  members,
  initialChores
}: {
  familyId: string;
  members: MemberOption[];
  initialChores?: ChoreRow[];
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { routeState, updateRouteState, openItem, clearItem, clearCreate } = useCollectionRouteState();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChoreRow["status"]>("all");
  const query = useQuery({
    queryKey: ["chores", familyId],
    queryFn: () => fetchChores(familyId),
    initialData: initialChores
  });

  const completeMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const response = await fetch(`/api/chores/${choreId}/complete`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("chores.completeError", "Failed to complete chore"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores", familyId] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
    }
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chores-${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chores", filter: `family_id=eq.${familyId}` },
        () => queryClient.invalidateQueries({ queryKey: ["chores", familyId] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);

  const filteredChores = useMemo(() => {
    return (query.data ?? []).filter((chore) => {
      const matchesQuery = search.trim().length === 0 || chore.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || chore.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query.data, search, statusFilter]);

  const groupedByMember = useMemo(() => {
    const map = new Map<string, ChoreRow[]>();
    for (const chore of filteredChores) {
      const key = chore.assigned_to_user_id ?? "unassigned";
      const bucket = map.get(key) ?? [];
      bucket.push(chore);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).map(([userId, chores]) => {
      const member = members.find((item) => item.userId === userId);
      const done = chores.filter((item) => item.status === "done").length;
      const points = chores.filter((item) => item.status === "done").reduce((total, item) => total + item.points, 0);
      return {
        userId,
        displayName: member?.displayName ?? (userId === "unassigned" ? t("tasks.unassigned", "Unassigned") : t("common.member", "Member")),
        chores,
        done,
        points
      };
    });
  }, [filteredChores, members, t]);

  const leaderboard = [...groupedByMember].sort((a, b) => b.points - a.points);
  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "chore",
      Component: (props) => <ChoreDetailPanel {...props} members={members} />
    }
  ];

  return (
    <div className="loom-stack">
      <CollectionControls>
        <CollectionControlField>
          <span>{t("common.search", "Search")}</span>
          <input className="loom-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("chores.searchPlaceholder", "Search chores")} />
        </CollectionControlField>
        <CollectionControlField>
          <span>{t("common.filter", "Filter")}</span>
          <select className="loom-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">{t("tasks.filterAll", "All")}</option>
            <option value="todo">{t("tasks.statusTodo", "To do")}</option>
            <option value="done">{t("tasks.statusDone", "Done")}</option>
          </select>
        </CollectionControlField>
      </CollectionControls>

      {query.isPending ? <p className="loom-muted">{t("chores.loading", "Loading chores...")}</p> : null}
      {query.error ? <p className="loom-feedback-error">{query.error.message}</p> : null}

      <section className="loom-grid-2">
        {groupedByMember.map((member) => (
          <article key={member.userId} className="loom-card loom-collection-card p-5">
            <div className="loom-row-between">
              <div>
                <h3 className="m-0 font-semibold">{member.displayName}</h3>
                <p className="loom-muted small m-0">{member.points} {t("home.points", "points")}</p>
              </div>
              <span className="loom-home-pill">{member.done}/{member.chores.length} {t("tasks.statusDone", "done")}</span>
            </div>

            <div className="loom-stack-sm mt-3">
              {member.chores.map((chore) => (
                <div key={chore.id} className="loom-soft-row">
                  <div className="loom-row-between">
                    <div>
                      <button type="button" className="loom-link-button loom-link-strong" onClick={() => openItem(chore.id)}>
                        {chore.title}
                      </button>
                      <p className="loom-muted small m-0">{chore.points} {t("home.points", "points")} {chore.due_date ? `- ${t("tasks.due", "due").toLowerCase()} ${chore.due_date}` : ""}</p>
                    </div>
                    <button
                      type="button"
                      className="loom-button-ghost"
                      aria-label={
                        chore.status === "done"
                          ? `${chore.title} ${t("tasks.statusDone", "Done")}`
                          : `${t("chores.completeAction", "Complete chore")}: ${chore.title}`
                      }
                      onClick={() => completeMutation.mutate(chore.id)}
                      disabled={chore.status === "done"}
                    >
                      {chore.status === "done" ? t("tasks.statusDone", "Done") : t("common.complete", "Complete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {groupedByMember.length === 0 && !query.isPending ? <p className="loom-muted">{t("common.none", "None")}</p> : null}
      </section>

      <section className="loom-card loom-collection-card p-5">
        <h3 className="loom-section-title">{t("chores.leaderboardMonth", "Leaderboard - This month")}</h3>
        <div className="loom-stack-sm mt-3">
          {leaderboard.map((entry, index) => (
            <div key={entry.userId} className="loom-soft-row">
              <div className="loom-row-between">
                <p className="m-0">#{index + 1} {entry.displayName}</p>
                <p className="m-0 font-semibold">{entry.points} pts</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 ? <p className="loom-muted">{t("chores.noPoints", "No chore points yet.")}</p> : null}
        </div>
      </section>

      <CreateEntityModal
        isOpen={routeState.create === "chore"}
        title={t("chores.createTitle", "Create chore")}
        eyebrow={t("nav.chores", "Chores & Rewards")}
        subtitle={t("chores.createSubtitle", "Assign chores with points and due dates.")}
        onClose={() => clearCreate()}
      >
        <ChoreForm
          familyId={familyId}
          members={members}
          endpoint="/api/chores"
          method="POST"
          submitLabel={t("chores.createTitle", "Create chore")}
          redirectTo="/chores"
          disableRedirect
          onSaved={({ choreId }) => {
            queryClient.invalidateQueries({ queryKey: ["chores"] });
            clearCreate();
            if (choreId) {
              openItem(choreId);
            }
          }}
        />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
