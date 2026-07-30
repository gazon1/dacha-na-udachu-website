import type { NextConfig } from "next";

// Server-only (not NEXT_PUBLIC_*), read at runtime by the Node process.
// In Docker Compose: http://web:8000 (docker-internal hostname).
// Not baked into the client bundle.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

// Public — used so Next.js build can reference it; resolves to the same origin
// the browser loads from, so it never leaks Docker hostnames to the client.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack for stability

  // Expose SITE_URL to the runtime without NEXT_PUBLIC_ prefix
  env: {
    NEXT_PUBLIC_SITE_URL: SITE_URL,
  },

  async rewrites() {
    return [
      // Django Ninja API + Wagtail headless API
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },

      // Wagtail admin
      { source: "/admin/:path*", destination: `${BACKEND_URL}/admin/:path*` },
      { source: "/cms/:path*", destination: `${BACKEND_URL}/admin/:path*` },
      { source: "/django-admin/:path*", destination: `${BACKEND_URL}/django-admin/:path*` },

      // Static assets served by Django
      { source: "/documents/:path*", destination: `${BACKEND_URL}/documents/:path*` },
      { source: "/static/:path*", destination: `${BACKEND_URL}/static/:path*` },
      { source: "/media/:path*", destination: `${BACKEND_URL}/media/:path*` },

      // App pages proxied to Django
      { source: "/search/:path*", destination: `${BACKEND_URL}/search/:path*` },
      { source: "/booking/:path*", destination: `${BACKEND_URL}/booking/:path*` },
      { source: "/events/:path*", destination: `${BACKEND_URL}/events/:path*` },
      { source: "/newsletter/:path*", destination: `${BACKEND_URL}/newsletter/:path*` },

      // Health check — also used by compose healthcheck through Next.js
      { source: "/health/:path*", destination: `${BACKEND_URL}/health/:path*` },
    ];
  },
};

export default nextConfig;
