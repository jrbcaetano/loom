import { requireGuest } from "@/lib/auth";
import { ForgotPasswordForm } from "@/features/auth/forms";

export default async function ForgotPasswordPage() {
  await requireGuest();

  return (
    <div className="loom-stack">
      <h1 className="loom-section-title">Reset password</h1>
      <ForgotPasswordForm />
    </div>
  );
}
