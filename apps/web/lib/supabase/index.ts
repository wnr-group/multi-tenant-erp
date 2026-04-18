import { createBrowserClient } from "@supabase/ssr";

function getCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (host.includes("lvh.me")) return ".lvh.me";
  if (host.includes("balajierp.com")) return ".balajierp.com";
  return undefined;
}

export function createClient() {
  const cookieDomain = getCookieDomain();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain
      ? {
          cookieOptions: {
            domain: cookieDomain,
          },
        }
      : undefined
  );
}
