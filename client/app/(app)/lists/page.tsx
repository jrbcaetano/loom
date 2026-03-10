import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getListsWithStatsForFamily } from "@/features/lists/server";
import { ListsBoardClient } from "@/features/lists/lists-board-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ListsPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("lists.createFamilyToUse")}</p>;
  }

  const lists = await getListsWithStatsForFamily(context.activeFamilyId);

  return (
    <div className="loom-module-page loom-lists-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.lists")}</h2>
          <p className="loom-module-subtitle">
            {lists.length} {t("lists.countLabel")}
          </p>
        </div>
        <Link href="/lists/new" className="loom-lists-plus-button" aria-label={t("lists.createAction")}>
          +
        </Link>
      </section>
      <ListsBoardClient lists={lists} />
    </div>
  );
}
