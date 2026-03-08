"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  preferredLocale: z.enum(["en", "pt"])
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({
  defaultValues
}: {
  defaultValues: {
    fullName: string;
    preferredLocale: "en" | "pt";
    avatarUrl: string | null;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaultValues.avatarUrl);
  const router = useRouter();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: defaultValues.fullName,
      preferredLocale: defaultValues.preferredLocale
    }
  });

  async function uploadAvatar(file: File) {
    const supabase = createClient();
    const fileExt = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onSubmit(values: ProfileValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        avatarUrl
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? "Failed to update profile");
      setIsLoading(false);
      return;
    }

    await fetch("/api/settings/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: values.preferredLocale })
    });

    setIsLoading(false);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>Full name</span>
        <input className="loom-input" type="text" {...form.register("fullName")} />
      </label>

      <label className="loom-field">
        <span>Language</span>
        <select className="loom-input" {...form.register("preferredLocale")}>
          <option value="en">English</option>
          <option value="pt">Portuguese</option>
        </select>
      </label>

      <label className="loom-field">
        <span>Avatar</span>
        <input
          className="loom-input"
          type="file"
          accept="image/*"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              setIsLoading(true);
              const url = await uploadAvatar(file);
              setAvatarUrl(url);
              setIsLoading(false);
            } catch (error) {
              setServerError(error instanceof Error ? error.message : "Failed to upload avatar");
              setIsLoading(false);
            }
          }}
        />
      </label>

      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="loom-avatar-preview" /> : null}

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save profile"}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
