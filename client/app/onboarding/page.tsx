import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";

export default async function OnboardingPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (context.families.length > 0) {
    return (
      <main className="loom-auth-page">
        <section className="loom-auth-card">
          <h1 className="loom-section-title">You are all set</h1>
          <p className="loom-muted">Your family workspace is ready.</p>
          <Link href="/home" className="loom-button-primary">
            Open dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="loom-auth-page">
      <section className="loom-auth-card">
        <h1 className="loom-section-title">Welcome to Loom</h1>
        <p className="loom-muted">Create your family workspace to start sharing lists, tasks, and events.</p>
        <Link href="/onboarding/create-family" className="loom-button-primary">
          Create family
        </Link>
      </section>
    </main>
  );
}
