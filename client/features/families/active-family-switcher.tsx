"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type FamilyOption = {
  id: string;
  name: string;
};

export function ActiveFamilySwitcher({ families, activeFamilyId }: { families: FamilyOption[]; activeFamilyId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <label className="loom-field">
      <span>Active family</span>
      <select
        className="loom-input"
        defaultValue={activeFamilyId ?? ""}
        onChange={(event) => {
          const familyId = event.target.value || null;
          startTransition(async () => {
            await fetch("/api/settings/active-family", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ familyId })
            });
            router.refresh();
          });
        }}
        disabled={isPending}
      >
        {families.map((family) => (
          <option key={family.id} value={family.id}>
            {family.name}
          </option>
        ))}
      </select>
    </label>
  );
}
