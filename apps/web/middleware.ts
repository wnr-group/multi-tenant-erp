import { type NextRequest, NextResponse } from "next/server";

// Full auth + domain-resolution middleware implemented in Plan 2.
// For now, all requests pass through.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
