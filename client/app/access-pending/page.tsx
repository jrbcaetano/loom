import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";
import { hasAppAccessByUserId, isProductAdminByUserId } from "@/features/admin/server";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AccessPendingPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const [isProductAdmin, hasAccess] = await Promise.all([
    isProductAdminByUserId(user.id),
    hasAppAccessByUserId(user.id)
  ]);

  if (isProductAdmin || hasAccess) {
    redirect("/home");
  }

  return (
    <main className="loom-auth-shell">
      <div className="loom-auth-wrap">
        <section className="loom-auth-card">
          <h1 className="loom-auth-title">{t("auth.pendingAccessTitle", "Access pending activation")}</h1>
          <p className="loom-auth-subtitle">
            {t(
              "auth.pendingAccessBody",
              "Your account was created, but Loom is in invite-only mode. A product admin must activate your access request."
            )}
          </p>
          <p className="loom-muted">
            {t(
              "auth.pendingAccessNext",
              "Once your access is activated, sign in again and you will enter the app normally."
            )}
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
