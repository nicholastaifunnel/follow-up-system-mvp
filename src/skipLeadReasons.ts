export const SKIP_REASON_VALUES = [
  "no_phone",
  "too_many_reviews",
  "has_website",
  "not_suitable",
  "other",
] as const;

export type SkipReasonValue = (typeof SKIP_REASON_VALUES)[number];

const LABELS: Record<SkipReasonValue, string> = {
  no_phone: "No phone",
  too_many_reviews: "Too many reviews",
  has_website: "Has website",
  not_suitable: "Not suitable",
  other: "Other",
};

export function isSkipReasonValue(v: string): v is SkipReasonValue {
  return (SKIP_REASON_VALUES as readonly string[]).includes(v);
}

export function skipReasonLabel(key: string | null | undefined): string {
  if (!key) return "—";
  if (isSkipReasonValue(key)) return LABELS[key];
  return key;
}
