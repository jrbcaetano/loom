import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getListsWithStatsForFamily, getShoppingListIdForFamily, isMultipleListsEnabledForFamily } from "@/features/lists/server";
import { ListsBoardClient } from "@/features/lists/lists-board-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ListsPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("lists.createFamilyToUse")}</p>;
  }

  const allowMultipleLists = await isMultipleListsEnabledForFamily(context.activeFamilyId);
  if (!allowMultipleLists) {
    const shoppingListId = await getShoppingListIdForFamily(context.activeFamilyId);
    if (shoppingListId) {
      redirect(`/lists/${shoppingListId}`);
    }
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
        {allowMultipleLists ? (
          <Link href="/lists/new" className="loom-module-header-plus loom-lists-plus-button" aria-label={t("lists.createAction")}>
            +
          </Link>
        ) : null}
      </section>
      <ListsBoardClient lists={lists} canCreate={allowMultipleLists} />
    </div>
  );
}
