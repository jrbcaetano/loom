import { requireGuest } from "@/lib/auth";
import { ForgotPasswordForm } from "@/features/auth/forms";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ForgotPasswordPage() {
  await requireGuest();
  const { t } = await getServerI18n();

  return (
    <div className="loom-auth-wrap">
      <section className="loom-auth-hero">
        <div className="loom-auth-logo is-soft">{"@"}</div>
        <h1 className="loom-auth-title">{t("auth.forgot")}</h1>
        <p className="loom-auth-subtitle">{t("auth.forgotSubtitle")}</p>
      </section>
      <section className="loom-auth-card">
        <ForgotPasswordForm />
      </section>
    </div>
  );
}
