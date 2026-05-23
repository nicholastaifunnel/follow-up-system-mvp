"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function slugifyBase(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "apply-link";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugifyBase(name);
  let slug = base;
  let n = 0;
  while (await prisma.adApplyLink.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export type AdApplyLinkActionResult =
  | { ok: true }
  | { ok: false; error: string };

function readString(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function readOptional(fd: FormData, key: string): string | null {
  const v = readString(fd, key);
  return v || null;
}

export async function saveAdApplyLinkAction(
  fd: FormData,
): Promise<AdApplyLinkActionResult> {
  const id = readString(fd, "id");
  const name = readString(fd, "name");
  if (!name) return { ok: false, error: "Name is required." };

  const data = {
    name,
    industry: readOptional(fd, "industry"),
    landingPageName: readOptional(fd, "landingPageName"),
    landingPageUrl: readOptional(fd, "landingPageUrl"),
    landingPageVersion: readOptional(fd, "landingPageVersion"),
    campaignName: readOptional(fd, "campaignName"),
    campaignId: readOptional(fd, "campaignId"),
    adSetName: readOptional(fd, "adSetName"),
    adSetId: readOptional(fd, "adSetId"),
    adName: readOptional(fd, "adName"),
    adId: readOptional(fd, "adId"),
    placementPage: readOptional(fd, "placementPage"),
    sourceChannel: readOptional(fd, "sourceChannel") ?? "Facebook Ads",
    notes: readOptional(fd, "notes"),
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  };

  if (id) {
    const slugInput = readString(fd, "slug");
    const update: Parameters<typeof prisma.adApplyLink.update>[0]["data"] = { ...data };
    if (slugInput) {
      const taken = await prisma.adApplyLink.findFirst({
        where: { slug: slugInput, NOT: { id } },
      });
      if (taken) return { ok: false, error: "Slug already in use." };
      update.slug = slugInput;
    }
    await prisma.adApplyLink.update({ where: { id }, data: update });
  } else {
    const slug = readString(fd, "slug") || (await uniqueSlug(name));
    const taken = await prisma.adApplyLink.findUnique({ where: { slug } });
    if (taken) return { ok: false, error: "Slug already in use." };
    await prisma.adApplyLink.create({
      data: { slug, ...data },
    });
  }

  revalidatePath("/ad-apply-links");
  return { ok: true };
}

export async function toggleAdApplyLinkActiveAction(
  id: string,
  isActive: boolean,
): Promise<AdApplyLinkActionResult> {
  await prisma.adApplyLink.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/ad-apply-links");
  return { ok: true };
}
