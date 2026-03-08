"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(120)
});

type CreateFamilyValues = z.infer<typeof createFamilySchema>;

export function CreateFamilyForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateFamilyValues>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { name: "" }
  });

  async function onSubmit(values: CreateFamilyValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/families", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? "Failed to create family");
      setIsLoading(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>Family name</span>
        <input type="text" className="loom-input" {...form.register("name")} />
        {form.formState.errors.name ? <p className="loom-feedback-error">{form.formState.errors.name.message}</p> : null}
      </label>

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create family"}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
