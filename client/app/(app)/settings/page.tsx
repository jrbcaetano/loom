import { getRequestLocale, requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ActiveFamilySwitcher } from "@/features/families/active-family-switcher";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await requireUser();
  const locale = await getRequestLocale();
  const context = await getActiveFamilyContext(user.id);

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <h2 className="loom-section-title">Language</h2>
        <div className="mt-3">
          <LanguageSwitcher locale={locale} />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Active family</h2>
        <div className="mt-3">
          <ActiveFamilySwitcher
            families={context.families.map((family) => ({ id: family.id, name: family.name }))}
            activeFamilyId={context.activeFamilyId}
          />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Feature areas</h2>
        <div className="loom-stack-sm mt-3">
          <Link href="/messages" className="loom-subtle-link">
            Messages
          </Link>
          <Link href="/meals" className="loom-subtle-link">
            Meals
          </Link>
          <Link href="/expenses" className="loom-subtle-link">
            Expenses
          </Link>
          <Link href="/documents" className="loom-subtle-link">
            Documents
          </Link>
          <Link href="/routines" className="loom-subtle-link">
            Routines
          </Link>
          <Link href="/notes" className="loom-subtle-link">
            Notes
          </Link>
          <Link href="/chores" className="loom-subtle-link">
            Chores
          </Link>
          <Link href="/rewards" className="loom-subtle-link">
            Rewards
          </Link>
        </div>
      </section>
    </div>
  );
}
