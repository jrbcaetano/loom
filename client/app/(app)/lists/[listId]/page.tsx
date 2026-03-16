import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getListById, getShoppingListIdForFamily, isMultipleListsEnabledForFamily } from "@/features/lists/server";
import { ListItemsClient } from "@/features/lists/list-items-client";
import { getFamilyMembers } from "@/features/families/server";
import { ListForm } from "@/features/lists/list-form";
import { getServerI18n } from "@/lib/i18n/server";
import { getDisplayListTitle } from "@/features/lists/display";

type ListDetailPageProps = {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

function getListIcon(title: string, isSystemShoppingList: boolean) {
  if (isSystemShoppingList) return "\u{1F6D2}";

  const value = title.toLowerCase();

  if (value.includes("hardware")) return "\u{1F527}";
  if (value.includes("travel") || value.includes("packing")) return "\u2708\uFE0F";
  if (value.includes("gift")) return "\u{1F381}";
  if (value.includes("school")) return "\u{1F393}";
  return "\u{1F4DD}";
}

function serializeCategoryLine(category: { value: string; translations: Record<string, string> }) {
  const entries = Object.entries(category.translations ?? {})
    .map(([locale, label]) => [locale.trim(), label.trim()] as const)
    .filter(([locale, label]) => locale.length > 0 && label.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) {
    return category.value;
  }

  const suffix = entries.map(([locale, label]) => `${locale}=${label}`).join(" | ");
  return `${category.value} | ${suffix}`;
}

export default async function ListDetailPage({ params, searchParams }: ListDetailPageProps) {
  const { listId } = await params;
  const query = await searchParams;
  const { t, locale } = await getServerI18n();
  const list = await getListById(listId, locale);
  const displayTitle = list ? getDisplayListTitle(list.title, list.isSystemShoppingList, t) : "";

  if (!list) {
    notFound();
  }

  const allowMultipleLists = await isMultipleListsEnabledForFamily(list.familyId);
  if (!allowMultipleLists && !list.isSystemShoppingList) {
    const shoppingListId = await getShoppingListIdForFamily(list.familyId);
    if (shoppingListId) {
      redirect(`/lists/${shoppingListId}`);
    }
  }

  const members = (await getFamilyMembers(list.familyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return (
    <div className="loom-lists-detail-shell loom-lists-page">
      <Link href="/lists" className="loom-subtle-link">
        {"\u2190 "}
        {t("lists.back")}
      </Link>

      <section className="loom-lists-detail-header">
        <div className="loom-lists-detail-icon" aria-hidden>
          {getListIcon(list.title, list.isSystemShoppingList)}
        </div>
        <div className="loom-lists-detail-title-block">
          <div className="loom-row-between">
            <h2 className="loom-lists-detail-title">{displayTitle}</h2>
            <Link href={`/lists/${list.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-lists-kebab-link" aria-label={t("lists.editList")}>
              {"\u22EE"}
            </Link>
          </div>

          <div className="loom-inline-actions">
            <span className={`loom-home-pill ${list.visibility === "family" || list.isSystemShoppingList ? "" : "is-muted"}`}>
              {list.visibility === "family" || list.isSystemShoppingList ? t("common.shared") : t("visibility.private")}
            </span>
            {list.isSystemShoppingList ? <span className="loom-lists-system-pill">{t("lists.systemList")}</span> : null}
          </div>
        </div>
      </section>

      <ListItemsClient
        listId={list.id}
        isSystemShoppingList={list.isSystemShoppingList}
        canDelete={!list.isSystemShoppingList}
        categories={list.categories}
      />

      {query.edit === "1" ? (
        <div className="loom-drawer-overlay" role="presentation">
          <Link href={`/lists/${list.id}`} className="loom-drawer-backdrop" aria-label={t("common.close", "Close")} />
          <aside className="loom-drawer-panel" role="dialog" aria-modal="true" aria-label={t("lists.editList")}>
            <header className="loom-drawer-header">
              <h3 className="loom-section-title m-0">{t("lists.editList")}</h3>
              <Link href={`/lists/${list.id}`} className="loom-button-ghost">
                {t("common.close", "Close")}
              </Link>
            </header>
            <div className="loom-drawer-content">
              <ListForm
                familyId={list.familyId}
                members={members}
                redirectTo={`/lists/${list.id}`}
                endpoint={`/api/lists/${list.id}`}
                method="PATCH"
                submitLabel={t("common.save")}
                cancelHref={`/lists/${list.id}`}
                lockSystemFields={list.isSystemShoppingList}
                initialValues={{
                  title: list.title,
                  description: list.description ?? "",
                  visibility: list.visibility,
                  categoriesText: list.categories.map(serializeCategoryLine).join("\n")
                }}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
