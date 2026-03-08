"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
