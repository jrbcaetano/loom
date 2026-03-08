"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

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

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="loom-form-stack">
      <label className="loom-field">
        <span>Email</span>
        <input className="loom-input" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="loom-feedback-error">{form.formState.errors.email.message}</p> : null}
      </label>

      <label className="loom-field">
        <span>Password</span>
        <input className="loom-input" type="password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="loom-feedback-error">{form.formState.errors.password.message}</p> : null}
      </label>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Log in"}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}

      <div className="loom-inline-links">
        <Link href="/register">Create account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "" }
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
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
      setServerError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess("Account created. Check your email if confirmation is required.");
    setIsLoading(false);
    form.reset();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="loom-form-stack">
      <label className="loom-field">
        <span>Full name</span>
        <input className="loom-input" type="text" {...form.register("fullName")} />
        {form.formState.errors.fullName ? <p className="loom-feedback-error">{form.formState.errors.fullName.message}</p> : null}
      </label>

      <label className="loom-field">
        <span>Email</span>
        <input className="loom-input" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="loom-feedback-error">{form.formState.errors.email.message}</p> : null}
      </label>

      <label className="loom-field">
        <span>Password</span>
        <input className="loom-input" type="password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="loom-feedback-error">{form.formState.errors.password.message}</p> : null}
      </label>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create account"}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
      {success ? <p className="loom-feedback-success">{success}</p> : null}

      <div className="loom-inline-links">
        <Link href="/login">Already have an account? Log in</Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

    setSuccess("Reset instructions sent if the account exists.");
    setIsLoading(false);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="loom-form-stack">
      <label className="loom-field">
        <span>Email</span>
        <input className="loom-input" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="loom-feedback-error">{form.formState.errors.email.message}</p> : null}
      </label>

      <button type="submit" className="loom-button-primary" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send reset link"}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
      {success ? <p className="loom-feedback-success">{success}</p> : null}

      <div className="loom-inline-links">
        <Link href="/login">Back to login</Link>
      </div>
    </form>
  );
}
