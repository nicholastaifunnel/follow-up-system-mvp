import type { AdApplyLink, Prisma, PrismaClient } from "@prisma/client";
import { LEAD_REVIEW_NEEDS_REVIEW } from "./leadReviewStatus";
import { snapshotFromAdApplyLink, snapshotToLeadFields } from "./adApplyLinkSnapshot";
import {
  appendManualNote,
  buildDncReactivationUpdate,
  isProtectedCustomerLead,
  shouldReactivateFromDnc,
} from "./adLeadProtection";
import { findLeadByWhatsAppDigits, normalizeWhatsAppInput } from "./adLeadPhone";
import { AD_LEAD_PENDING } from "./adLeadStatus";
import { MESSAGE_STATUS_NOT_PREPARED } from "./statusConstants";

export type AdApplyFormInput = {
  contactPerson: string;
  whatsappNumber: string;
  businessName: string;
  googleMapName: string;
  facebookPage: string;
};

export type SubmitAdApplyFormResult =
  | { ok: true; leadId: string; businessName: string }
  | { ok: false; error: string };

function inboundNote(link: AdApplyLink, now: Date): string {
  const parts = [
    `[Ad form ${now.toISOString().slice(0, 16).replace("T", " ")} UTC]`,
    `Apply link: ${link.name}`,
    link.landingPageVersion ? `LP version: ${link.landingPageVersion}` : null,
    link.campaignName ? `Campaign: ${link.campaignName}` : null,
    link.adName ? `Ad: ${link.adName}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export async function submitAdApplyForm(
  db: PrismaClient,
  link: AdApplyLink,
  input: AdApplyFormInput,
): Promise<SubmitAdApplyFormResult> {
  const contactPerson = input.contactPerson.trim();
  const businessName = input.businessName.trim();
  const googleMapName = input.googleMapName.trim();
  const facebookPage = input.facebookPage.trim() || null;

  if (!contactPerson || !businessName || !googleMapName) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  const phoneNorm = normalizeWhatsAppInput(input.whatsappNumber);
  if (!phoneNorm) {
    return { ok: false, error: "Please enter a valid WhatsApp number." };
  }

  const now = new Date();
  const snapshot = snapshotFromAdApplyLink(link);
  const meta = snapshotToLeadFields(snapshot);
  const noteLine = inboundNote(link, now);

  const existingMatch = await findLeadByWhatsAppDigits(db, phoneNorm.digits);
  const existing = existingMatch
    ? await db.lead.findUnique({ where: { id: existingMatch.id } })
    : null;

  if (!existing) {
    const created = await db.lead.create({
      data: {
        businessName,
        whatsappPhone: phoneNorm.whatsappPhone,
        phone: phoneNorm.phone ?? undefined,
        internationalPhone: phoneNorm.internationalPhone ?? undefined,
        contactPerson,
        googleMapName,
        facebookPage,
        outreachReadiness: LEAD_REVIEW_NEEDS_REVIEW,
        messageStatus: MESSAGE_STATUS_NOT_PREPARED,
        contactStatus: "Not Contacted",
        leadTemperature: "Cold",
        manualNotes: noteLine,
        trialRequestedAt: now,
        adLeadStatus: AD_LEAD_PENDING,
        adApplyLinkId: link.id,
        applyLinkName: meta.applyLinkName as string,
        landingPageVersion: meta.landingPageVersion as string | null,
        adCampaignName: meta.adCampaignName as string | null,
        adCampaignId: meta.adCampaignId as string | null,
        adSetName: meta.adSetName as string | null,
        adSetId: meta.adSetId as string | null,
        adName: meta.adName as string | null,
        adId: meta.adId as string | null,
        inboundSourceChannel: meta.inboundSourceChannel as string | null,
        botStatus: "Not Connected",
        isArchived: false,
      },
    });
    return { ok: true, leadId: created.id, businessName: created.businessName };
  }

  if (isProtectedCustomerLead(existing)) {
    await db.lead.update({
      where: { id: existing.id },
      data: {
        manualNotes: appendManualNote(
          existing.manualNotes,
          `${noteLine}\nNew inbound free trial request (existing customer — status unchanged).`,
        ),
        contactPerson: contactPerson || existing.contactPerson,
        googleMapName: googleMapName || existing.googleMapName,
        facebookPage: facebookPage ?? existing.facebookPage,
        trialRequestedAt: existing.trialRequestedAt ?? now,
        ...meta,
        updatedAt: now,
      },
    });
    return { ok: true, leadId: existing.id, businessName: existing.businessName };
  }

  const updateData: Prisma.LeadUpdateInput = {
    businessName: businessName || existing.businessName,
    whatsappPhone: phoneNorm.whatsappPhone,
    phone: phoneNorm.phone ?? existing.phone,
    internationalPhone: phoneNorm.internationalPhone ?? existing.internationalPhone,
    contactPerson,
    googleMapName,
    facebookPage,
    manualNotes: appendManualNote(existing.manualNotes, noteLine),
    trialRequestedAt: now,
    adLeadStatus: AD_LEAD_PENDING,
    adApprovedAt: null,
    outreachReadiness: LEAD_REVIEW_NEEDS_REVIEW,
    ...meta,
    updatedAt: now,
  };

  if (shouldReactivateFromDnc(existing)) {
    Object.assign(updateData, buildDncReactivationUpdate(existing, now));
    updateData.manualNotes = appendManualNote(
      updateData.manualNotes as string | undefined,
      noteLine,
    );
  }

  await db.lead.update({
    where: { id: existing.id },
    data: updateData,
  });

  return { ok: true, leadId: existing.id, businessName: existing.businessName };
}
