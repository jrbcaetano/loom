import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getServerI18n } from "@/lib/i18n/server";

export default async function OnboardingPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (context.families.length > 0) {
    return (
      <main className="loom-auth-shell">
        <section className="loom-auth-wrap">
          <div className="loom-auth-logo">{"\uD83C\uDFE0"}</div>
          <h1 className="loom-auth-title">{t("onboarding.readyTitle", "You are all set")}</h1>
          <p className="loom-auth-subtitle">{t("onboarding.readySubtitle", "Your family workspace is ready.")}</p>
          <Link href="/home" className="loom-button-primary">
            {t("onboarding.openDashboard", "Open dashboard")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="loom-auth-shell">
      <section className="loom-auth-wrap">
        <div className="loom-auth-logo">{"\uD83C\uDFE0"}</div>
        <h1 className="loom-auth-title">{t("onboarding.welcomeTitle", "Welcome to Loom")}</h1>
        <p className="loom-auth-subtitle">{t("onboarding.welcomeSubtitle", "The simple way to coordinate family life.")}</p>
        <div className="loom-stack-sm">
          <article className="loom-card p-4">
            <p className="m-0 font-semibold">{t("onboarding.benefits.organizedTitle", "Stay organized")}</p>
            <p className="m-0 loom-muted small">{t("onboarding.benefits.organizedBody", "Manage tasks, events, and shopping lists in one place.")}</p>
          </article>
          <article className="loom-card p-4">
            <p className="m-0 font-semibold">{t("onboarding.benefits.coordinationTitle", "Family coordination")}</p>
            <p className="m-0 loom-muted small">{t("onboarding.benefits.coordinationBody", "Keep everyone aligned with shared spaces and updates.")}</p>
          </article>
          <article className="loom-card p-4">
            <p className="m-0 font-semibold">{t("onboarding.benefits.progressTitle", "Track progress")}</p>
            <p className="m-0 loom-muted small">{t("onboarding.benefits.progressBody", "Gamify chores and reward children for consistency.")}</p>
          </article>
        </div>
        <Link href="/onboarding/create-family" className="loom-button-primary">
          {t("onboarding.createFamilyCta", "Create your family")}
        </Link>
      </section>
    </main>
  );
}
