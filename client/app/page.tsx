import { redirect } from "next/navigation";
import { SignInWithGoogle } from "@/components/sign-in-with-google";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6">
      <div className="loom-card w-full p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--loom-color-primary)]">Loom MVP</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">Shared family planning without the noise.</h1>
        <p className="mt-3 text-sm loom-muted">
          Authentication is the first foundation step. Sign in to access your spaces.
        </p>
        <div className="mt-6">
          <SignInWithGoogle />
        </div>
      </div>
    </main>
  );
}
