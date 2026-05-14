/**
 * HttpOnly session cookie for internal auth (Edge + Node compatible via Web Crypto).
 */

export const AUTH_COOKIE_NAME = "fsmvp_auth";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256B64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(sig);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)!;
  }
  return diff === 0;
}

export function isAuthConfigured(): boolean {
  const p = process.env.APP_PASSWORD;
  const s = process.env.AUTH_COOKIE_SECRET;
  return Boolean(p && p.length > 0 && s && s.length > 0);
}

/** Signed token: `${issuedAt}.${signature}` */
export async function mintAuthToken(secret: string): Promise<string> {
  const issued = String(Date.now());
  const sig = await hmacSha256B64Url(secret, issued);
  return `${issued}.${sig}`;
}

export async function verifyAuthToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const issuedStr = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const issued = Number.parseInt(issuedStr, 10);
  if (!Number.isFinite(issued)) return false;
  if (Date.now() - issued > SESSION_TTL_MS) return false;
  const expected = await hmacSha256B64Url(secret, issuedStr);
  return timingSafeEqualStr(sig, expected);
}

export function authCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
