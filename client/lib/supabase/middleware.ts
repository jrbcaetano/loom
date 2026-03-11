import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveProductFeatureKeyFromPathname } from "@/lib/product-features";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const featureKey = resolveProductFeatureKeyFromPathname(request.nextUrl.pathname);
  if (!user || !featureKey) {
    return response;
  }

  const { data, error } = await supabase
    .from("product_feature_flags")
    .select("is_enabled")
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (error || !data || data.is_enabled) {
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/home";
  redirectUrl.search = "";
  const redirectResponse = NextResponse.redirect(redirectUrl);
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
