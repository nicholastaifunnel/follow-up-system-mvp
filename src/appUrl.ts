const PRODUCTION_FALLBACK = "https://follow-up-system-mvp.vercel.app";

/** Server-side base URL for shareable links (landing page buttons, copy). */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || PRODUCTION_FALLBACK;
  return raw.replace(/\/$/, "");
}

export function buildApplyFormUrl(slug: string): string {
  const base = getAppBaseUrl();
  const path = `/apply/${slug.replace(/^\/+/, "")}`;
  return `${base}${path}`;
}
