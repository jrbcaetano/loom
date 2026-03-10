import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { getMyProfile } from "@/features/profile/server";
import { ProfileForm } from "@/features/profile/profile-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const profile = await getMyProfile();
  const context = await getActiveFamilyContext(user.id);

  if (!profile) {
    return <p className="loom-muted">{t("profile.signInToEdit", "Sign in to edit your profile.")}</p>;
  }

  const activeFamilyId = context.activeFamilyId;
  const members = activeFamilyId ? await getFamilyMembers(activeFamilyId) : [];

  const supabase = await createClient();
  const [tasksRes, eventsRes, listsRes] = await Promise.all([
    activeFamilyId
      ? supabase.from("tasks").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId)
      : Promise.resolve({ count: 0, error: null }),
    activeFamilyId
      ? supabase.from("events").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId)
      : Promise.resolve({ count: 0, error: null }),
    activeFamilyId
      ? supabase.from("lists").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId)
      : Promise.resolve({ count: 0, error: null })
  ]);

  const avatarText = (profile.fullName ?? profile.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.profile", "Profile")}</h2>
          <p className="loom-module-subtitle">{t("profile.subtitle", "Manage your account and family settings.")}</p>
        </div>
      </section>

      <section className="loom-grid-3">
        <article className="loom-card p-5">
          <div className="loom-stack-sm" style={{ alignItems: "center", textAlign: "center" }}>
            {profile.avatarUrl ? (
              <div className="loom-avatar-preview has-image" style={{ backgroundImage: `url(${profile.avatarUrl})` }} aria-hidden />
            ) : (
              <div className="loom-header-avatar" style={{ width: 80, height: 80, fontSize: "2rem" }}>
                {avatarText}
              </div>
            )}
            <h3 className="m-0 font-semibold">{profile.fullName ?? t("common.member", "Member")}</h3>
            <p className="loom-muted small m-0">{profile.email ?? t("profile.noEmail", "No email")}</p>
            <span className="loom-home-pill">{members.find((member) => member.userId === user.id)?.role ?? t("common.member", "member")}</span>
          </div>

          <div className="loom-grid-3 mt-4">
            <div className="loom-stat">
              <p className="loom-stat-value">{tasksRes.count ?? 0}</p>
              <p className="loom-stat-label">{t("nav.tasks", "Tasks")}</p>
            </div>
            <div className="loom-stat">
              <p className="loom-stat-value">{eventsRes.count ?? 0}</p>
              <p className="loom-stat-label">{t("calendar.events", "Events")}</p>
            </div>
            <div className="loom-stat">
              <p className="loom-stat-value">{listsRes.count ?? 0}</p>
              <p className="loom-stat-label">{t("nav.lists", "Lists")}</p>
            </div>
          </div>

          <Link href="/settings" className="loom-button-ghost mt-4" style={{ display: "inline-flex", width: "100%", justifyContent: "center" }}>
            {t("profile.appSettings", "App settings")}
          </Link>
        </article>

        <section className="loom-stack loom-span-2-desktop">
          <article className="loom-card p-5">
            <div className="loom-row-between">
              <h3 className="loom-section-title">{t("profile.familyMembers", "Family members")}</h3>
              <Link href="/family/members" className="loom-subtle-link">
                {t("common.manage", "Manage")}
              </Link>
            </div>
            <div className="loom-entity-list mt-3">
              {members.map((member) => (
                <div key={member.id} className="loom-entity-row">
                  <div>
                    <p className="loom-entity-title">{member.fullName ?? member.email ?? t("common.member", "Member")}</p>
                    <p className="loom-entity-meta">{member.role} - {member.status}</p>
                  </div>
                </div>
              ))}
              {members.length === 0 ? <p className="loom-muted">{t("profile.noMembers", "No members found.")}</p> : null}
            </div>
          </article>

          <article className="loom-card p-5">
            <ProfileForm
              defaultValues={{
                fullName: profile.fullName ?? "",
                preferredLocale: profile.preferredLocale === "pt" ? "pt" : "en",
                avatarUrl: profile.avatarUrl
              }}
            />
          </article>
        </section>
      </section>
    </div>
  );
}
