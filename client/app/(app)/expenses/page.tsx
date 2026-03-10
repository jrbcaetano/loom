import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { ExpensesClient } from "@/features/expenses/expenses-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ExpensesPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.expenses", "Expenses")}</h2>
          <p className="loom-module-subtitle">{t("expenses.subtitle", "Track family spending and review monthly totals.")}</p>
        </div>
        <Link href="/expenses/new" className="loom-button-primary">
          {t("expenses.new", "New expense")}
        </Link>
      </section>
      <ExpensesClient familyId={context.activeFamilyId} />
    </div>
  );
}
