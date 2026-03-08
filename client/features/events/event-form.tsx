"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const eventSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(5000).optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    location: z.string().trim().max(240).optional(),
    allDay: z.boolean(),
    visibility: z.enum(["private", "family", "selected_members"])
  })
  .refine((value) => new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(), {
    path: ["endAt"],
    message: "End date must be after start date"
  });

type EventValues = z.infer<typeof eventSchema>;

type MemberOption = {
  userId: string;
  displayName: string;
};

export function EventForm({
  familyId,
  members,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  initialValues
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<EventValues>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      startAt: initialValues?.startAt ?? "",
      endAt: initialValues?.endAt ?? "",
      location: initialValues?.location ?? "",
      allDay: initialValues?.allDay ?? false,
      visibility: initialValues?.visibility ?? "family"
    }
  });

  const visibility = form.watch("visibility");

  async function onSubmit(values: EventValues) {
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
        title: values.title,
        description: values.description || null,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        location: values.location || null,
        allDay: values.allDay,
        visibility: values.visibility,
        selectedMemberIds
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; eventId?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? "Failed to save event");
      setIsLoading(false);
      return;
    }

    const destination = payload?.eventId ? `/calendar/${payload.eventId}` : redirectTo;
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

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>Start</span>
          <input className="loom-input" type="datetime-local" {...form.register("startAt")} />
        </label>

        <label className="loom-field">
          <span>End</span>
          <input className="loom-input" type="datetime-local" {...form.register("endAt")} />
        </label>
      </div>

      <label className="loom-field">
        <span>Location</span>
        <input className="loom-input" type="text" {...form.register("location")} />
      </label>

      <label className="loom-field">
        <span>Visibility</span>
        <select className="loom-input" {...form.register("visibility")}>
          <option value="private">Private</option>
          <option value="family">Family</option>
          <option value="selected_members">Selected members</option>
        </select>
      </label>

      <label className="loom-checkbox-row">
        <input type="checkbox" {...form.register("allDay")} />
        <span>All day event</span>
      </label>

      {visibility === "selected_members" ? (
        <div className="loom-card soft p-4">
          <p className="m-0 font-semibold">Select members</p>
          <div className="loom-stack-sm mt-3">
            {members.map((member) => (
              <label key={member.userId} className="loom-checkbox-row">
                <input type="checkbox" name="selectedMembers" value={member.userId} />
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
