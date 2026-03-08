import Link from "next/link";

export default function MealsPage() {
  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <h2 className="loom-section-title">Meal planning</h2>
        <p className="loom-muted mt-2">Plan family meals and turn recipe ingredients into shopping list items.</p>
        <div className="loom-form-inline mt-4">
          <Link href="/meals/planner" className="loom-button-primary">
            Open planner
          </Link>
          <Link href="/meals/recipes" className="loom-button-ghost">
            Manage recipes
          </Link>
        </div>
      </section>
    </div>
  );
}
