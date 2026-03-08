import { requireGuest } from "@/lib/auth";
import { LoginForm } from "@/features/auth/forms";

export default async function LoginPage() {
  await requireGuest();

  return (
    <div className="loom-stack">
      <h1 className="loom-section-title">Log in</h1>
      <LoginForm />
    </div>
  );
}
