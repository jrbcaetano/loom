import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { FamilySettingsForm } from "@/features/families/family-settings-form";

export default async function FamilySettingsPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const activeFamily = context.families.find((family) => family.id === context.activeFamilyId) ?? null;

  if (!activeFamily) {
    return <p className="loom-muted">No active family selected.</p>;
  }

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">Family settings</h2>
      <p className="loom-muted mt-1">Admins can update family details.</p>
      <div className="mt-4">
        <FamilySettingsForm familyId={activeFamily.id} defaultName={activeFamily.name} />
      </div>
    </section>
  );
}
