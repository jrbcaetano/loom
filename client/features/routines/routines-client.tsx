"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

type RoutineRow = {
  id: string;
  title: string;
  schedule_type: "daily" | "weekly" | "custom";
};

async function fetchRoutines(familyId: string) {
  const response = await fetch(`/api/routines?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { routines?: RoutineRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load routines");
  return payload.routines ?? [];
}

export function RoutinesClient({ familyId }: { familyId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["routines", familyId],
    queryFn: () => fetchRoutines(familyId)
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

  return (
    <section className="loom-card p-3">
      {query.isPending ? <p className="loom-muted p-4">{t("routines.loading", "Loading routines...")}</p> : null}
      {query.error ? <p className="loom-feedback-error p-4">{query.error.message}</p> : null}
      <div className="loom-stack-sm">
        {(query.data ?? []).map((routine) => (
          <article key={routine.id} className="loom-conversation-row">
            <div>
              <Link href={`/routines/${routine.id}`} className="loom-link-strong">
                {routine.title}
              </Link>
              <p className="loom-entity-meta capitalize">{routine.schedule_type}</p>
            </div>
            <button className="loom-button-ghost" type="button" onClick={() => completeMutation.mutate(routine.id)}>
              {t("routines.completeNow", "Complete now")}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
