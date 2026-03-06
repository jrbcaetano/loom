"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInWithGoogle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <button type="button" onClick={handleSignIn} disabled={loading} className="loom-button-primary w-full">
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
      {error ? <p className="mt-2 loom-feedback-error">{error}</p> : null}
    </div>
  );
}
