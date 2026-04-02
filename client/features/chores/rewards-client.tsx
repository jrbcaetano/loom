"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CollectionControls, CollectionControlField } from "@/components/patterns/collection-controls";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry, type EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

type RewardsResponse = {
  balance: number;
  transactions: Array<{ id: string; points: number; type: "earn" | "redeem"; created_at: string; reference_id?: string | null }>;
};

async function fetchRewards() {
  const response = await fetch("/api/rewards", { cache: "no-store" });
  const payload = (await response.json()) as RewardsResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load rewards");
  return payload;
}

function RewardTransactionDetailPanel({ itemId, close }: EntityDetailRegistryEntryProps) {
  const { t, dateLocale } = useI18n();
  const query = useQuery({
    queryKey: ["rewards"],
    queryFn: fetchRewards
  });

  const transaction = query.data?.transactions.find((entry) => entry.id === itemId) ?? null;

  return (
    <EntityDetailShell
      isOpen
      title={transaction ? `${transaction.type === "earn" ? "+" : "-"}${transaction.points} ${t("home.points", "points")}` : t("rewards.detailTitle", "Reward transaction")}
      eyebrow={t("nav.rewards", "Rewards")}
      subtitle={transaction ? new Date(transaction.created_at).toLocaleString(dateLocale) : undefined}
      summaryMeta={transaction ? (
        <EntitySummaryMeta>
          <EntitySummaryMetaItem label={t("common.type", "Type")} value={transaction.type} />
          <EntitySummaryMetaItem label={t("home.points", "Points")} value={transaction.points} />
        </EntitySummaryMeta>
      ) : undefined}
      onClose={close}
    >
      {query.isPending ? <EntityDrawerLoadingState message={t("rewards.loading", "Loading rewards...")} /> : null}
      {query.error ? <EntityDrawerErrorState message={query.error.message} /> : null}
      {!query.isPending && !query.error && !transaction ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}
      {transaction ? (
        <EntitySection title={t("common.details", "Details")}>
          <EntityMetadataGrid>
            <EntityMetadataItem label={t("common.type", "Type")} value={transaction.type} />
            <EntityMetadataItem label={t("home.points", "Points")} value={transaction.points} />
            <EntityMetadataItem label={t("common.created", "Created")} value={new Date(transaction.created_at).toLocaleString(dateLocale)} />
            <EntityMetadataItem label={t("common.reference", "Reference")} value={transaction.reference_id ?? t("common.notSet", "Not set")} />
          </EntityMetadataGrid>
        </EntitySection>
      ) : null}
    </EntityDetailShell>
  );
}

export function RewardsClient() {
  const { t, dateLocale } = useI18n();
  const { routeState, updateRouteState, openItem, clearItem } = useCollectionRouteState();
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const query = useQuery({
    queryKey: ["rewards"],
    queryFn: fetchRewards
  });

  const transactions = useMemo(() => {
    const items = [...(query.data?.transactions ?? [])];
    items.sort((left, right) => {
      const delta = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      return sortOrder === "oldest" ? delta : -delta;
    });
    return items;
  }, [query.data?.transactions, sortOrder]);

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "reward-transaction",
      Component: RewardTransactionDetailPanel
    }
  ];

  return (
    <div className="loom-stack">
      <CollectionControls>
          <CollectionControlField>
            <span>{t("common.sort", "Sort")}</span>
            <select className="loom-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
              <option value="newest">{t("common.newest", "Newest")}</option>
              <option value="oldest">{t("common.oldest", "Oldest")}</option>
            </select>
          </CollectionControlField>
      </CollectionControls>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("nav.rewards", "Rewards")}</h2>
        {query.isPending ? <p className="loom-muted mt-3">{t("rewards.loading", "Loading rewards...")}</p> : null}
        {query.error ? <p className="loom-feedback-error mt-3">{query.error.message}</p> : null}
        {query.data ? (
          <div className="loom-stack-sm mt-3">
            <p className="m-0 text-xl font-semibold">{query.data.balance} {t("home.points", "points")}</p>
            {transactions.map((transaction) => (
              <button
                key={transaction.id}
                type="button"
                className="loom-conversation-row loom-link-button"
                aria-label={`${t("rewards.openTransaction", "Open transaction")}: ${transaction.type} ${transaction.points}`}
                onClick={() => openItem(transaction.id)}
              >
                <span className="font-semibold">
                  {transaction.type === "earn" ? "+" : "-"}{transaction.points}
                </span>
                <span className="loom-muted small">{new Date(transaction.created_at).toLocaleString(dateLocale)}</span>
              </button>
            ))}
            {transactions.length === 0 ? <p className="loom-muted">{t("rewards.noTransactions", "No reward activity yet.")}</p> : null}
          </div>
        ) : null}
      </section>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
