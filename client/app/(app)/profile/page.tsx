import { getMyProfile } from "@/features/profile/server";
import { ProfileForm } from "@/features/profile/profile-form";

export default async function ProfilePage() {
  const profile = await getMyProfile();

  if (!profile) {
    return <p className="loom-muted">Sign in to edit your profile.</p>;
  }

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">Profile</h2>
      <div className="mt-4">
        <ProfileForm
          defaultValues={{
            fullName: profile.fullName ?? "",
            preferredLocale: (profile.preferredLocale === "pt" ? "pt" : "en"),
            avatarUrl: profile.avatarUrl
          }}
        />
      </div>
    </section>
  );
}
