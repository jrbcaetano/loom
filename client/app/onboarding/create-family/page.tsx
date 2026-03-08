import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { CreateFamilyForm } from "@/features/families/create-family-form";

export default async function CreateFamilyPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (context.families.length > 0) {
    return null;
  }

  return (
    <main className="loom-auth-page">
      <section className="loom-auth-card">
        <h1 className="loom-section-title">Create your family</h1>
        <CreateFamilyForm />
      </section>
    </main>
  );
}
