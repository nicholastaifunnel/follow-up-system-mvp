"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  isAuthConfigured,
  mintAuthToken,
} from "@/lib/authSession";

function safeRedirectPath(from: string | undefined): string {
  if (!from || typeof from !== "string") return "/queues";
  if (!from.startsWith("/") || from.startsWith("//")) return "/queues";
  if (from.includes("://") || from.includes("@")) return "/queues";
  return from;
}

export async function loginAction(formData: FormData): Promise<void> {
  if (!isAuthConfigured()) {
    redirect("/login?error=config");
  }

  const password = formData.get("password");
  const fromRaw = formData.get("from");
  const from =
    typeof fromRaw === "string" ? safeRedirectPath(fromRaw) : "/queues";

  const expected = process.env.APP_PASSWORD ?? "";
  const got = typeof password === "string" ? password : "";

  const a = Buffer.from(got, "utf8");
  const b = Buffer.from(expected, "utf8");
  const ok =
    a.length === b.length && a.length > 0 && timingSafeEqual(a, b);

  if (!ok) {
    redirect("/login?error=1");
  }

  const secret = process.env.AUTH_COOKIE_SECRET!;
  const token = await mintAuthToken(secret);
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, token, authCookieOptions());

  redirect(from);
}
