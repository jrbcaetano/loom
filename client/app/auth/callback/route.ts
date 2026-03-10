import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value) {
    return "/home";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const oauthProviderError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  function redirectToLoginWithError(message: string) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("oauth_error", message);
    return NextResponse.redirect(loginUrl);
  }

  if (oauthProviderError) {
    return redirectToLoginWithError(oauthProviderError);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectToLoginWithError(error.message);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
