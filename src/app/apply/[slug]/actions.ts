"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitAdApplyForm } from "@/submitAdApplyForm";

export async function submitApplyFormAction(slug: string, fd: FormData) {
  const link = await prisma.adApplyLink.findUnique({ where: { slug } });
  if (!link || !link.isActive) {
    return { ok: false as const, error: "This form is not available." };
  }

  const result = await submitAdApplyForm(prisma, link, {
    contactPerson: String(fd.get("contactPerson") ?? ""),
    whatsappNumber: String(fd.get("whatsappNumber") ?? ""),
    businessName: String(fd.get("businessName") ?? ""),
    googleMapName: String(fd.get("googleMapName") ?? ""),
    facebookPage: String(fd.get("facebookPage") ?? ""),
  });

  if (!result.ok) {
    return result;
  }

  const q = new URLSearchParams({
    business: result.businessName,
  });
  redirect(`/apply/${slug}/thank-you?${q.toString()}`);
}
