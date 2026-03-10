import { requireGuest } from "@/lib/auth";
import { RegisterForm } from "@/features/auth/forms";
import { getServerI18n } from "@/lib/i18n/server";

export default async function RegisterPage() {
  await requireGuest();
  const { t } = await getServerI18n();

  return (
    <div className="loom-auth-wrap">
      <section className="loom-auth-hero">
        <div className="loom-auth-logo">{"\uD83C\uDFE0"}</div>
        <h1 className="loom-auth-title">{t("auth.register")}</h1>
        <p className="loom-auth-subtitle">{t("auth.registerSubtitle")}</p>
      </section>
      <section className="loom-auth-card">
        <RegisterForm />
      </section>
    </div>
  );
}
