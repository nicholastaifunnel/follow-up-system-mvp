import type { Prisma } from "@prisma/client";

export type QueueAngleParam =
  | "all"
  | "no-website"
  | "low-review"
  | "has-website"
  | "has-phone"
  | "no-phone";

const ALLOWED_ANGLES: QueueAngleParam[] = [
  "all",
  "no-website",
  "low-review",
  "has-website",
  "has-phone",
  "no-phone",
];

export function parseQueueAngleParam(
  raw: string | string[] | undefined,
): QueueAngleParam {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const s = String(v ?? "all")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (ALLOWED_ANGLES.includes(s as QueueAngleParam)) {
    return s as QueueAngleParam;
  }
  return "all";
}

/** Preset caps for Message Queue list; omit URL param for “any”. */
export function parseReviewMaxParam(
  raw: string | string[] | undefined,
): number | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return undefined;
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return undefined;
  if (n === 50 || n === 100 || n === 200) return n;
  return undefined;
}

const hasPhoneDigits: Prisma.LeadWhereInput = {
  OR: [
    {
      AND: [{ phone: { not: null } }, { NOT: { phone: "" } }],
    },
    {
      AND: [
        { internationalPhone: { not: null } },
        { NOT: { internationalPhone: "" } },
      ],
    },
  ],
};

/**
 * Extra AND clauses for queue / phone list views only (read paths).
 * Does not mutate data.
 */
export function queueListExtraWhere(
  angle: QueueAngleParam,
  reviewMax?: number,
): Prisma.LeadWhereInput | undefined {
  const clauses: Prisma.LeadWhereInput[] = [];

  if (angle === "no-website") {
    clauses.push({
      OR: [
        { website: null },
        { website: "" },
        { leadLevel: "No Website" },
      ],
    });
  } else if (angle === "low-review") {
    clauses.push({ leadLevel: "Low Review" });
  } else if (angle === "has-website") {
    clauses.push({
      AND: [{ website: { not: null } }, { NOT: { website: "" } }],
    });
  } else if (angle === "has-phone") {
    clauses.push(hasPhoneDigits);
  } else if (angle === "no-phone") {
    clauses.push({ NOT: hasPhoneDigits });
  }

  if (reviewMax !== undefined) {
    clauses.push({ reviewCount: { lte: reviewMax } });
  }

  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

export function mergeQueueListWhere(
  base: Prisma.LeadWhereInput,
  extra: Prisma.LeadWhereInput | undefined,
): Prisma.LeadWhereInput {
  if (!extra) return base;
  return { AND: [base, extra] };
}
