"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

type RewardsResponse = {
  balance: number;
  transactions: Array<{ id: string; points: number; type: "earn" | "redeem"; created_at: string }>;
};

async function fetchRewards() {
  const response = await fetch("/api/rewards", { cache: "no-store" });
  const payload = (await response.json()) as RewardsResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load rewards");
  return payload;
}

export function RewardsClient() {
  const { t, locale } = useI18n();
  const query = useQuery({
    queryKey: ["rewards"],
    queryFn: fetchRewards
  });

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">{t("nav.rewards", "Rewards")}</h2>
      {query.isPending ? <p className="loom-muted mt-3">{t("rewards.loading", "Loading rewards...")}</p> : null}
      {query.error ? <p className="loom-feedback-error mt-3">{query.error.message}</p> : null}
      {query.data ? (
        <div className="loom-stack-sm mt-3">
          <p className="m-0 text-xl font-semibold">{query.data.balance} {t("home.points", "points")}</p>
          {(query.data.transactions ?? []).slice(0, 20).map((transaction) => (
            <p key={transaction.id} className="m-0 loom-muted small">
              {transaction.type === "earn" ? "+" : "-"}
              {transaction.points} - {new Date(transaction.created_at).toLocaleString(locale === "pt" ? "pt-PT" : "en-US")}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
