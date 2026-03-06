"use client";

import { useActionState } from "react";

type InviteState = { error: string | null; success: string | null };

const initialState: InviteState = { error: null, success: null };

export function InviteMemberForm({
  action
}: {
  action: (state: InviteState, formData: FormData) => Promise<InviteState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="loom-form-row">
      <input
        type="email"
        name="email"
        placeholder="member@example.com"
        required
        className="loom-input"
      />
      <button type="submit" disabled={isPending} className="loom-button-primary">
        {isPending ? "Sending..." : "Invite member"}
      </button>
      {state.error ? <p className="loom-feedback-error">{state.error}</p> : null}
      {!state.error && state.success ? <p className="loom-feedback-success">{state.success}</p> : null}
    </form>
  );
}
