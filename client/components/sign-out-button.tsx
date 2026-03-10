"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useI18n();

  function onSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button type="button" className="loom-button-ghost" onClick={onSignOut} disabled={isPending}>
      {isPending ? t("auth.signingOut") : t("auth.signOut")}
    </button>
  );
}
