import { requireGuest } from "@/lib/auth";
import { LoginForm } from "@/features/auth/forms";
import { getServerI18n } from "@/lib/i18n/server";

export default async function LoginPage() {
  await requireGuest();
  const { t } = await getServerI18n();

  return (
    <div className="loom-auth-wrap">
      <section className="loom-auth-hero">
        <div className="loom-auth-logo">{"\uD83C\uDFE0"}</div>
        <h1 className="loom-auth-title">{t("auth.welcome")}</h1>
        <p className="loom-auth-subtitle">{t("auth.subtitle")}</p>
      </section>
      <section className="loom-auth-card">
        <LoginForm />
      </section>
    </div>
  );
}
