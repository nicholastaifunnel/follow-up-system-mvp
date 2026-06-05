import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthConfigured,
  verifyAuthToken,
} from "@/lib/authSession";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (!isAuthConfigured()) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_COOKIE_SECRET!;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const valid = token ? await verifyAuthToken(token, secret) : false;

  if (valid) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  const path = request.nextUrl.pathname + request.nextUrl.search;
  if (path !== "/login" && path.startsWith("/")) {
    login.searchParams.set("from", request.nextUrl.pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/queues/:path*",
    "/import/:path*",
    "/leads/:path*",
    "/reply-sop/:path*",
    "/message-templates/:path*",
    "/review-trials/:path*",
    "/skipped-leads/:path*",
    "/system-health/:path*",
    "/ad-apply-links/:path*",
    "/ad-leads/:path*",
    "/landing-pages/:path*",
    "/ad-leads/export",
    "/tools/:path*",
  ],
};
