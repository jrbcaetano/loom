import type { ReactNode } from "react";
import { getServerI18n } from "@/lib/i18n/server";
import { requireProductAdminUser } from "@/features/admin/server";
import { AdminSecondaryNav } from "@/features/admin/admin-secondary-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
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
              "Manage platform-level access while the app remains invite-only."
            )}
          </p>
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("admin.securityTitle", "Security")}</h2>
        <p className="loom-muted mt-1">
          {t(
            "admin.securityBody",
            "This area is protected by server-side checks and database policies."
          )}
        </p>
      </section>

      <AdminSecondaryNav />
      {children}
    </div>
  );
}
