// Server-side Supabase client for Next.js App Router only.
// Kept in apps/web (not packages/shared) to avoid importing next/headers
// into the Expo mobile bundle, which does not support it.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

// Bypasses RLS — use only for unauthenticated server-side reads (e.g. login page branding)
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const isLvh = host.includes("lvh.me");
  const isBalaji = host.includes("balajierp.com");
  const cookieDomain = isLvh ? ".lvh.me" : isBalaji ? ".balajierp.com" : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain: cookieDomain })
            );
          } catch {
            // called from Server Component — cookies will be set by middleware
          }
        },
      },
    }
  );
}
