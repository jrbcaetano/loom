import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { getAuthAvatarUrl, getAuthDisplayName } from "@/lib/auth-user";
import { getActiveFamilyContext } from "@/features/families/context";
import { getMyProfile } from "@/features/profile/server";
import { AppShell } from "@/components/layout/app-shell";
import { isProductAdminByUserId } from "@/features/admin/server";
import { getUnreadNotificationsCount } from "@/features/notifications/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [profile, context, isProductAdmin, unreadNotificationsCount] = await Promise.all([
    getMyProfile(),
    getActiveFamilyContext(user.id),
    isProductAdminByUserId(user.id),
    getUnreadNotificationsCount()
  ]);

  if (context.families.length === 0) {
    redirect("/onboarding");
  }

  const activeFamily = context.families.find((family) => family.id === context.activeFamilyId) ?? context.families[0];

  return (
    <AppShell
      userEmail={user.email ?? ""}
      userDisplayName={profile?.fullName ?? getAuthDisplayName(user)}
      userAvatarUrl={profile?.avatarUrl ?? getAuthAvatarUrl(user)}
      activeFamilyName={activeFamily?.name ?? null}
      isProductAdmin={isProductAdmin}
      unreadNotificationsCount={unreadNotificationsCount}
    >
      {children}
    </AppShell>
  );
}
