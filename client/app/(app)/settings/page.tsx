import { getRequestLocale, requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getRequestRegionalSettings } from "@/lib/regional/server";
import { ActiveFamilySwitcher } from "@/features/families/active-family-switcher";
import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";
import { PushSettingsClient } from "@/features/push/push-settings-client";
import { TaskLabelsManager } from "@/features/tasks/task-labels-manager";
import { RegionalSettingsForm } from "@/features/profile/regional-settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const locale = await getRequestLocale();
  const regionalSettings = await getRequestRegionalSettings();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.settings")}</h2>
          <p className="loom-module-subtitle">{t("settings.subtitle")}</p>
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("settings.regional", "Regional settings")}</h2>
        <p className="loom-muted small mt-2 mb-0">{t("settings.regionalHint", "Language, date format, and time format used across Loom.")}</p>
        <div className="mt-3">
          <RegionalSettingsForm locale={locale} dateFormat={regionalSettings.dateFormat} timeFormat={regionalSettings.timeFormat} />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("settings.activeFamily")}</h2>
        <div className="mt-3">
          <ActiveFamilySwitcher
            families={context.families.map((family) => ({ id: family.id, name: family.name }))}
            activeFamilyId={context.activeFamilyId}
          />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("settings.pushNotifications", "Push notifications")}</h2>
        <div className="mt-3">
          <PushSettingsClient />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("settings.personalTaskLabels", "Personal task labels")}</h2>
        <p className="loom-muted small mt-2 mb-0">{t("settings.personalTaskLabelsHint", "These labels only apply to your own task organization.")}</p>
        <div className="mt-3">
          <TaskLabelsManager scope="personal" />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("settings.featureAreas")}</h2>
        <div className="loom-stack-sm mt-3">
          <Link href="/messages" className="loom-subtle-link">
            {t("nav.messages")}
          </Link>
          <Link href="/meals" className="loom-subtle-link">
            {t("nav.meals")}
          </Link>
          <Link href="/expenses" className="loom-subtle-link">
            {t("nav.expenses")}
          </Link>
          <Link href="/documents" className="loom-subtle-link">
            {t("nav.documents")}
          </Link>
          <Link href="/routines" className="loom-subtle-link">
            {t("nav.routines")}
          </Link>
          <Link href="/notes" className="loom-subtle-link">
            {t("nav.notes")}
          </Link>
          <Link href="/chores" className="loom-subtle-link">
            {t("nav.chores")}
          </Link>
          <Link href="/rewards" className="loom-subtle-link">
            {t("nav.rewards")}
          </Link>
        </div>
      </section>
    </div>
  );
}
