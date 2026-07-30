import { NextRequest, NextResponse } from "next/server";

// Thin rewrite layer — /admin and /cms are now served via next.config.ts rewrites
// so the browser stays on the same origin. This handler only swaps /cms → /admin.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/cms" || pathname.startsWith("/cms/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/cms/, "/admin");
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cms/:path*"],
};
