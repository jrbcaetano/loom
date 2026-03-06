"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={loading} className="loom-button-ghost">
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
