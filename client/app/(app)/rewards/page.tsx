import { RewardsClient } from "@/features/chores/rewards-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function RewardsPage() {
  const { t } = await getServerI18n();
  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.rewards", "Rewards")}</h2>
          <p className="loom-module-subtitle">{t("rewards.subtitle", "Track balances and recent points activity.")}</p>
        </div>
      </section>
      <RewardsClient />
    </div>
  );
}
