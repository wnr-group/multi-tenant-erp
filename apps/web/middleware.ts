import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/invite"];
const PLATFORM_ADMIN_DOMAIN = "admin.balajierp.com";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");
  const isPlatformAdmin =
    domain === PLATFORM_ADMIN_DOMAIN ||
    domain === "admin.localhost" ||
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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
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
    response.headers.set("x-school-id", school.id);
  }

  const roleQuery = supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (schoolId) {
    roleQuery.eq("school_id", schoolId);
  }

  const { data: roleRow } = await roleQuery.single();
  const role = roleRow?.role;

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPlatformAdmin) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!pathname.startsWith("/platform-admin")) {
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
    return NextResponse.redirect(
      `https://${PLATFORM_ADMIN_DOMAIN}/platform-admin/dashboard`
    );
  }

  if (effectiveRole === "school_admin" && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }
  if (effectiveRole === "principal" && !pathname.startsWith("/principal")) {
    return NextResponse.redirect(new URL("/principal/dashboard", request.url));
  }
  if (effectiveRole === "teacher" && !pathname.startsWith("/teacher")) {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
