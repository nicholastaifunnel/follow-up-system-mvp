const RM_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseRmToCents(
  input: string,
): { ok: true; cents: number | null } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: true, cents: null };
  }

  if (!RM_INPUT_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "Enter a valid amount (e.g. 29 or 1200.50).",
    };
  }

  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  const fraction = fractionPart.padEnd(2, "0").slice(0, 2);
  const cents = whole * 100 + Number(fraction);

  if (!Number.isFinite(cents) || cents < 0) {
    return { ok: false, error: "Amount cannot be negative." };
  }

  return { ok: true, cents };
}

function formatRmNumber(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const wholeFormatted = whole.toLocaleString("en-MY");
  return `${wholeFormatted}.${String(fraction).padStart(2, "0")}`;
}

export function formatRmFromCents(
  cents?: number | null,
  currency?: string | null,
): string {
  if (cents === null || cents === undefined) {
    return "—";
  }

  const code = (currency ?? "MYR").trim() || "MYR";
  const prefix = code === "MYR" ? "RM" : code;
  return `${prefix} ${formatRmNumber(cents)}`;
}

export function centsToRmInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}
