import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/invite"];
// Production: admin.balajierp.com | Local dev: core.lvh.me
const PLATFORM_ADMIN_DOMAINS = ["admin.balajierp.com", "core.lvh.me"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");
  const isPlatformAdmin =
    PLATFORM_ADMIN_DOMAINS.includes(domain) ||
    pathname.startsWith("/platform-admin");

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          // Share auth cookies across subdomains (.lvh.me for local, .balajierp.com for prod)
          const host = request.headers.get("host") ?? "";
          const isLvh = host.includes("lvh.me");
          const isBalaji = host.includes("balajierp.com");
          const cookieDomain = isLvh ? ".lvh.me" : isBalaji ? ".balajierp.com" : undefined;

          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
            });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let schoolId: string | null = null;
  if (!isPlatformAdmin) {
    const { data: school } = await supabase
      .from("schools")
      .select("id, is_active")
      .eq("domain", domain)
      .single();

    if (!school || !school.is_active) {
      return new NextResponse("School not found or inactive.", { status: 404 });
    }
    schoolId = school.id;
    // Set on request headers so server components can read via headers()
    request.headers.set("x-school-id", school.id);
    response = NextResponse.next({ request });
    response.headers.set("x-school-id", school.id);
  }

  // Try school-scoped role first (teachers, admins, etc.)
  let role: string | null = null;
  if (schoolId) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();
    role = data?.role ?? null;
  }

  // Fallback: platform-level role (super_admin has school_id = NULL)
  if (!role) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .is("school_id", null)
      .eq("is_active", true)
      .maybeSingle();
    role = data?.role ?? null;
  }

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPlatformAdmin) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!pathname.startsWith("/platform-admin") && !pathname.startsWith("/api")) {
      return NextResponse.redirect(
        new URL("/platform-admin/dashboard", request.url)
      );
    }
    return response;
  }

  const VALID_ROLES = ["super_admin", "school_admin", "principal", "teacher", "student", "parent"] as const;
  type AppRole = (typeof VALID_ROLES)[number];

  const rawActingAs = request.cookies.get("acting_as")?.value;
  const actingAsCookie = rawActingAs && VALID_ROLES.includes(rawActingAs as AppRole)
    ? rawActingAs as AppRole
    : undefined;
  const effectiveRole = actingAsCookie ?? role;

  if (actingAsCookie) {
    response.headers.set("x-acting-as", actingAsCookie);
    response.headers.set("x-real-role", role);
  }

  if (role === "super_admin" && !actingAsCookie) {
    // Redirect super_admin to the admin domain's dashboard
    const isLocalDev = domain.endsWith(".lvh.me") || domain.includes("localhost");
    const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
    const adminUrl = isLocalDev
      ? `http://core.lvh.me${port}/platform-admin/dashboard`
      : `https://${PLATFORM_ADMIN_DOMAINS[0]}/platform-admin/dashboard`;
    return NextResponse.redirect(adminUrl);
  }

  // Skip role-based redirects for API routes and auth routes
  if (!pathname.startsWith("/api") && !pathname.startsWith("/auth")) {
    if (effectiveRole === "school_admin" && !pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (effectiveRole === "principal" && !pathname.startsWith("/principal")) {
      return NextResponse.redirect(new URL("/principal/dashboard", request.url));
    }
    if (effectiveRole === "teacher" && !pathname.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
