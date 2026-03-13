import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { getAuthAvatarUrl, getAuthDisplayName } from "@/lib/auth-user";
import { getActiveFamilyContext } from "@/features/families/context";
import { getMyProfile } from "@/features/profile/server";
import { AppShell } from "@/components/layout/app-shell";
import { getProductFeatureAvailability, hasAppAccessByUserId, isProductAdminByUserId } from "@/features/admin/server";
import { getUnreadNotificationsCount } from "@/features/notifications/server";
import { getUnreadMessagesCount } from "@/features/messages/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [profile, context, isProductAdmin, hasAppAccess, unreadNotificationsCount, featureAvailability] = await Promise.all([
    getMyProfile(),
    getActiveFamilyContext(user.id),
    isProductAdminByUserId(user.id),
    hasAppAccessByUserId(user.id),
    getUnreadNotificationsCount(),
    getProductFeatureAvailability()
  ]);

  if (!isProductAdmin && !hasAppAccess) {
    redirect("/access-pending");
  }

  if (context.families.length === 0) {
    redirect("/onboarding");
  }

  const activeFamily = context.families.find((family) => family.id === context.activeFamilyId) ?? context.families[0];
  const unreadMessagesCount = activeFamily ? await getUnreadMessagesCount(activeFamily.id) : 0;

  return (
    <AppShell
      userEmail={user.email ?? ""}
      userDisplayName={profile?.fullName ?? getAuthDisplayName(user)}
      userAvatarUrl={profile?.avatarUrl ?? getAuthAvatarUrl(user)}
      activeFamilyName={activeFamily?.name ?? null}
      activeFamilyId={activeFamily?.id ?? null}
      isProductAdmin={isProductAdmin}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
      featureAvailability={featureAvailability}
    >
      {children}
    </AppShell>
  );
}
