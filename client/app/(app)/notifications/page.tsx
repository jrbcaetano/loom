import { NotificationsClient } from "@/features/notifications/notifications-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotificationsPage() {
  const { t } = await getServerI18n();
  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.notifications", "Notifications")}</h2>
          <p className="loom-module-subtitle">{t("notifications.subtitle", "Track assignments, shares, and family updates.")}</p>
        </div>
      </section>
      <NotificationsClient />
    </div>
  );
}
