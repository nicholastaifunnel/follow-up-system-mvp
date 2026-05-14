import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/authSession";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL("/login", request.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
