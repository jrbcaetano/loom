import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { getShoppingListIdForFamily, isMultipleListsEnabledForFamily } from "@/features/lists/server";
import { ListForm } from "@/features/lists/list-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewListPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst")}</p>;
  }

  const allowMultipleLists = await isMultipleListsEnabledForFamily(context.activeFamilyId);
  if (!allowMultipleLists) {
    const shoppingListId = await getShoppingListIdForFamily(context.activeFamilyId);
    redirect(shoppingListId ? `/lists/${shoppingListId}` : "/lists");
  }

  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("lists.createTitle")}</h2>
          <p className="loom-module-subtitle">{t("lists.createSubtitle")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <ListForm
          familyId={context.activeFamilyId}
          members={members}
          redirectTo="/lists"
          endpoint="/api/lists"
          method="POST"
          submitLabel={t("lists.createAction")}
          cancelHref="/lists"
        />
      </section>
    </div>
  );
}
