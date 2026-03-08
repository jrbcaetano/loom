import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (context.families.length === 0) {
    redirect("/onboarding");
  }

  const activeFamily = context.families.find((family) => family.id === context.activeFamilyId) ?? context.families[0];

  return (
    <AppShell userEmail={user.email ?? ""} activeFamilyName={activeFamily?.name ?? null}>
      {children}
    </AppShell>
  );
}
