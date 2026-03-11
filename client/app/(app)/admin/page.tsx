import { getServerI18n } from "@/lib/i18n/server";
import { AccessControlClient } from "@/features/admin/access-control-client";
import { FeatureFlagsClient } from "@/features/admin/feature-flags-client";
import { requireProductAdminUser } from "@/features/admin/server";

export default async function AdminPage() {
  await requireProductAdminUser();
  const { t } = await getServerI18n();

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("admin.title", "Product Admin")}</h2>
          <p className="loom-module-subtitle">
            {t(
              "admin.subtitle",
              "Manage platform-level access while the application remains invite-only."
            )}
          </p>
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("admin.securityTitle", "Security")}</h2>
        <p className="loom-muted mt-1">
          {t(
            "admin.securityBody",
            "This area is restricted to configured product administrators and enforced on server routes and database policies."
          )}
        </p>
      </section>

      <FeatureFlagsClient />
      <AccessControlClient />
    </div>
  );
}
