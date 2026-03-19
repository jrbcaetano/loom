import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { ChoresClient } from "@/features/chores/chores-client";
import { getChores } from "@/features/chores/server";
import { getFamilyMembers } from "@/features/families/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ChoresPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }));
  const initialChores = await getChores(context.activeFamilyId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.chores", "Chores & Rewards")}</h2>
          <p className="loom-module-subtitle">{t("chores.subtitle", "Assign chores and reward completed work with points.")}</p>
        </div>
        <Link href="/chores/new" className="loom-button-primary">
          {t("chores.new", "New chore")}
        </Link>
      </section>
      <ChoresClient familyId={context.activeFamilyId} members={members} initialChores={initialChores} />
    </div>
  );
}
