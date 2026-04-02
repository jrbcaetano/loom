"use client";

export function EntityDrawerLoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="loom-entity-drawer-state" role="status" aria-live="polite">
      <p className="loom-muted m-0">{message}</p>
    </div>
  );
}

export function EntityDrawerErrorState({ message }: { message: string }) {
  return (
    <div className="loom-entity-drawer-state is-error" role="alert">
      <p className="loom-feedback-error m-0">{message}</p>
    </div>
  );
}

export function EntityDrawerEmptyState({ message }: { message: string }) {
  return (
    <div className="loom-entity-drawer-state is-empty" role="status" aria-live="polite">
      <p className="loom-muted m-0">{message}</p>
    </div>
  );
}
