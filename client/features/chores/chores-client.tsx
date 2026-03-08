"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type ChoreRow = {
  id: string;
  title: string;
  points: number;
  due_date: string | null;
  status: "todo" | "done";
};

async function fetchChores(familyId: string) {
  const response = await fetch(`/api/chores?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { chores?: ChoreRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load chores");
  return payload.chores ?? [];
}

export function ChoresClient({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["chores", familyId],
    queryFn: () => fetchChores(familyId)
  });

  const completeMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const response = await fetch(`/api/chores/${choreId}/complete`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to complete chore");
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

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">Chores</h2>
      {query.isPending ? <p className="loom-muted mt-3">Loading chores...</p> : null}
      {query.error ? <p className="loom-feedback-error mt-3">{query.error.message}</p> : null}
      <div className="loom-stack-sm mt-3">
        {(query.data ?? []).map((chore) => (
          <article key={chore.id} className="loom-card soft p-4">
            <div className="loom-row-between">
              <div>
                <Link href={`/chores/${chore.id}`} className="loom-link-strong">
                  {chore.title}
                </Link>
                <p className="loom-muted small mt-1">
                  {chore.points} points {chore.due_date ? `- due ${chore.due_date}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="loom-button-ghost"
                onClick={() => completeMutation.mutate(chore.id)}
                disabled={chore.status === "done"}
              >
                {chore.status === "done" ? "Done" : "Complete"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
