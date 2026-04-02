import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { RoutinesClient } from "@/features/routines/routines-client";
import { getRoutines } from "@/features/routines/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function RoutinesPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }
  const initialRoutines = await getRoutines(context.activeFamilyId);
  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }));

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.routines", "Routines")}</h2>
          <p className="loom-module-subtitle">{t("routines.subtitle", "Recurring checklists for daily and weekly household routines.")}</p>
        </div>
        <Link href="/routines?create=routine" className="loom-module-header-plus" aria-label={t("routines.new", "New routine")}>
          +
        </Link>
      </section>
      <RoutinesClient familyId={context.activeFamilyId} members={members} initialRoutines={initialRoutines} />
    </div>
  );
}
