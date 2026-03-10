"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8)
});

type RegisterValues = z.infer<typeof registerSchema>;

const forgotSchema = z.object({
  email: z.string().email()
});

type ForgotValues = z.infer<typeof forgotSchema>;

function mapRegisterError(message: string, t: (key: string, fallback?: string) => string) {
  if (message.toLowerCase().includes("invite-only")) {
    return t("auth.inviteOnly", "This app is currently invite-only. Ask a product admin for access.");
  }

  return message;
}

function getOAuthRedirectTo(nextPath: string) {
  const next = encodeURIComponent(nextPath);
  return `${window.location.origin}/auth/callback?next=${next}`;
}

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    setOauthError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });

    if (error) {
      setServerError(error.message);
      setIsLoading(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  async function onGoogleSignIn() {
    setServerError(null);
    setOauthError(null);
    setIsGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo("/home")
      }
    });

    if (error) {
      setOauthError(error.message);
      setIsGoogleLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="loom-form-stack">
      <label className="loom-field">
        <span>{t("auth.email")}</span>
        <input className="loom-input" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="loom-feedback-error">{form.formState.errors.email.message}</p> : null}
      </label>

      <label className="loom-field">
        <span>{t("auth.password")}</span>
        <input className="loom-input" type="password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="loom-feedback-error">{form.formState.errors.password.message}</p> : null}
      </label>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? t("auth.loggingIn") : t("auth.login")}
      </button>

      <button type="button" className="loom-button-ghost" disabled={isGoogleLoading} onClick={() => void onGoogleSignIn()}>
        {isGoogleLoading ? t("auth.googleSigningIn", "Redirecting to Google...") : t("auth.googleLogin", "Continue with Google")}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
      {oauthError ? <p className="loom-feedback-error">{oauthError}</p> : null}

      <div className="loom-inline-links">
        <Link href="/register">{t("auth.register")}</Link>
        <Link href="/forgot-password">{t("auth.forgotPrompt")}</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { t } = useI18n();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "" }
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    setOauthError(null);
    setSuccess(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName
        }
      }
    });

    if (error) {
      setServerError(mapRegisterError(error.message, t));
      setIsLoading(false);
      return;
    }

    setSuccess(t("auth.registerSuccess"));
    setIsLoading(false);
    form.reset();
  }

  async function onGoogleSignIn() {
    setServerError(null);
    setOauthError(null);
    setSuccess(null);
    setIsGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo("/home")
      }
    });

    if (error) {
      setOauthError(error.message);
      setIsGoogleLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="loom-form-stack">
      <label className="loom-field">
        <span>{t("auth.fullName")}</span>
        <input className="loom-input" type="text" {...form.register("fullName")} />
        {form.formState.errors.fullName ? <p className="loom-feedback-error">{form.formState.errors.fullName.message}</p> : null}
      </label>

      <label className="loom-field">
        <span>{t("auth.email")}</span>
        <input className="loom-input" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="loom-feedback-error">{form.formState.errors.email.message}</p> : null}
      </label>

      <label className="loom-field">
        <span>{t("auth.password")}</span>
        <input className="loom-input" type="password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="loom-feedback-error">{form.formState.errors.password.message}</p> : null}
      </label>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? t("auth.creatingAccount") : t("auth.register")}
      </button>

      <button type="button" className="loom-button-ghost" disabled={isGoogleLoading} onClick={() => void onGoogleSignIn()}>
        {isGoogleLoading ? t("auth.googleSigningIn", "Redirecting to Google...") : t("auth.googleRegister", "Sign up with Google")}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
      {oauthError ? <p className="loom-feedback-error">{oauthError}</p> : null}
      {success ? <p className="loom-feedback-success">{success}</p> : null}

      <div className="loom-inline-links">
        <Link href="/login">{t("auth.hasAccount")}</Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useI18n();
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" }
  });

  async function onSubmit(values: ForgotValues) {
    setServerError(null);
    setSuccess(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/login`
    });

    if (error) {
      setServerError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(t("auth.resetSent"));
    setIsLoading(false);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="loom-form-stack">
      <label className="loom-field">
        <span>{t("auth.email")}</span>
        <input className="loom-input" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="loom-feedback-error">{form.formState.errors.email.message}</p> : null}
      </label>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? t("common.sending") : t("auth.sendReset")}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
      {success ? <p className="loom-feedback-success">{success}</p> : null}

      <div className="loom-inline-links">
        <Link href="/login">{t("auth.backToLogin")}</Link>
      </div>
    </form>
  );
}
