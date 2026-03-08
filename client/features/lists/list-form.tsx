"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const listSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  visibility: z.enum(["private", "family", "selected_members"])
});

type ListValues = z.infer<typeof listSchema>;

type MemberOption = {
  userId: string;
  displayName: string;
};

export function ListForm({
  familyId,
  members,
  redirectTo,
  submitLabel,
  endpoint,
  method,
  initialValues
}: {
  familyId: string;
  members: MemberOption[];
  redirectTo: string;
  submitLabel: string;
  endpoint: string;
  method: "POST" | "PATCH";
  initialValues?: Partial<ListValues>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ListValues>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      visibility: initialValues?.visibility ?? "family"
    }
  });

  const visibility = form.watch("visibility");

  async function onSubmit(values: ListValues) {
    setServerError(null);
    setIsLoading(true);

    const selectedMemberIds =
      visibility === "selected_members"
        ? Array.from(document.querySelectorAll<HTMLInputElement>('input[name="selectedMembers"]:checked')).map((input) => input.value)
        : [];

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        ...values,
        selectedMemberIds
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; listId?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? "Failed to save list");
      setIsLoading(false);
      return;
    }

    const destination = payload?.listId ? `/lists/${payload.listId}` : redirectTo;
    router.push(destination);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>Title</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>

      <label className="loom-field">
        <span>Description</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>

      <label className="loom-field">
        <span>Visibility</span>
        <select className="loom-input" {...form.register("visibility")}>
          <option value="private">Private</option>
          <option value="family">Family</option>
          <option value="selected_members">Selected members</option>
        </select>
      </label>

      {visibility === "selected_members" ? (
        <div className="loom-card soft p-4">
          <p className="m-0 font-semibold">Who can access this list</p>
          <div className="loom-stack-sm mt-3">
            {members.map((member) => (
              <label key={member.userId} className="loom-checkbox-row">
                <input type="checkbox" value={member.userId} name="selectedMembers" />
                <span>{member.displayName}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : submitLabel}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
