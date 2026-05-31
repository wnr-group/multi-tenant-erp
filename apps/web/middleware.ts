import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/download-app"];
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

  // Mobile app calls these API routes with Bearer token — skip cookie auth + school-domain check
  if (pathname.startsWith("/api/fees/") || pathname.startsWith("/api/students/import")) {
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
    request.headers.set("x-school-id", school.id);
    response = NextResponse.next({ request });
    response.headers.set("x-school-id", school.id);
  }

  // Resolve user's real role
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
    return NextResponse.redirect(new URL("/login?reason=no_access", request.url));
  }

  // Platform admin routing
  if (isPlatformAdmin) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/login?reason=no_access", request.url));
    }
    if (!pathname.startsWith("/platform-admin") && !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/platform-admin/dashboard", request.url));
    }
    return response;
  }

  // Read active section cookie and set header
  const activeSection = request.cookies.get("active_section")?.value ?? null;
  if (activeSection) {
    response.headers.set("x-active-section", activeSection);
  }

  // Super admin on school domain → treat as school_admin
  const effectiveRole = role === "super_admin" ? "school_admin" : role;

  // Route enforcement
  if (!pathname.startsWith("/api") && !pathname.startsWith("/auth")) {
    if (pathname.startsWith("/teacher")) {
      const canAccessTeacher =
        effectiveRole === "teacher" ||
        ((effectiveRole === "school_admin" || effectiveRole === "principal") && activeSection);
      if (!canAccessTeacher) {
        const dest = effectiveRole === "principal" ? "/principal/dashboard" : "/admin/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    } else if (effectiveRole === "school_admin" && !pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else if (effectiveRole === "principal" && !pathname.startsWith("/principal") && !pathname.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/principal/dashboard", request.url));
    } else if (effectiveRole === "teacher" && !pathname.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    } else if (effectiveRole === "parent" && !pathname.startsWith("/download-app")) {
      return NextResponse.redirect(new URL("/download-app", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|__nextjs_font|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
