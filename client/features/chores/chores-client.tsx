"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

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

export function ChoresClient({ familyId, members }: { familyId: string; members: MemberOption[] }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["chores", familyId],
    queryFn: () => fetchChores(familyId)
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

  const groupedByMember = useMemo(() => {
    const chores = query.data ?? [];
    const map = new Map<string, ChoreRow[]>();
    for (const chore of chores) {
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
  }, [query.data, members]);

  const leaderboard = [...groupedByMember].sort((a, b) => b.points - a.points);

  return (
    <div className="loom-stack">
      {query.isPending ? <p className="loom-muted">{t("chores.loading", "Loading chores...")}</p> : null}
      {query.error ? <p className="loom-feedback-error">{query.error.message}</p> : null}

      <section className="loom-grid-2">
        {groupedByMember.map((member) => (
          <article key={member.userId} className="loom-card p-5">
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
                      <Link href={`/chores/${chore.id}`} className="loom-link-strong">
                        {chore.title}
                      </Link>
                      <p className="loom-muted small m-0">{chore.points} {t("home.points", "points")} {chore.due_date ? `- ${t("tasks.due", "due").toLowerCase()} ${chore.due_date}` : ""}</p>
                    </div>
                    <button
                      type="button"
                      className="loom-button-ghost"
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
      </section>

      <section className="loom-card p-5">
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
    </div>
  );
}
