import { requireGuest } from "@/lib/auth";
import { RegisterForm } from "@/features/auth/forms";

export default async function RegisterPage() {
  await requireGuest();

  return (
    <div className="loom-stack">
      <h1 className="loom-section-title">Create account</h1>
      <RegisterForm />
    </div>
  );
}
