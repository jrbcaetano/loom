"use client";

import { useActionState } from "react";
import { createSpace } from "@/app/dashboard/actions";

type ActionState = { error: string | null };

const initialState: ActionState = { error: null };

async function createSpaceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return createSpace(formData);
}

export function CreateSpaceForm() {
  const [state, formAction, isPending] = useActionState(createSpaceAction, initialState);

  return (
    <form action={formAction} className="loom-form-row">
      <input
        type="text"
        name="name"
        placeholder="New space name"
        required
        maxLength={120}
        className="loom-input"
      />
      <button type="submit" disabled={isPending} className="loom-button-primary">
        {isPending ? "Creating..." : "Create space"}
      </button>
      {state.error ? <p className="loom-feedback-error">{state.error}</p> : null}
    </form>
  );
}
