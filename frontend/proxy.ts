import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATHS = ["/admin", "/cms"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only redirect if not already on the backend host
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const backendOrigin = backendUrl.replace(/\/+$/, "");
  if (request.nextUrl.origin === backendOrigin) {
    return NextResponse.next();
  }

  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(`${backendOrigin}${pathname}/`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cms/:path*"],
};
