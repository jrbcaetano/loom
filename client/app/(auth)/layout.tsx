import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="loom-auth-page">
      <section className="loom-auth-card">
        <p className="loom-brand">Loom</p>
        <p className="loom-muted">Shared family planning with private boundaries.</p>
        {children}
      </section>
    </main>
  );
}
