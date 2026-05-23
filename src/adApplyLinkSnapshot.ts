import type { AdApplyLink } from "@prisma/client";

export type AdApplyLinkSnapshot = {
  adApplyLinkId: string;
  applyLinkName: string;
  landingPageVersion: string | null;
  adCampaignName: string | null;
  adCampaignId: string | null;
  adSetName: string | null;
  adSetId: string | null;
  adName: string | null;
  adId: string | null;
  inboundSourceChannel: string | null;
};

export function snapshotFromAdApplyLink(link: AdApplyLink): AdApplyLinkSnapshot {
  return {
    adApplyLinkId: link.id,
    applyLinkName: link.name,
    landingPageVersion: link.landingPageVersion,
    adCampaignName: link.campaignName,
    adCampaignId: link.campaignId,
    adSetName: link.adSetName,
    adSetId: link.adSetId,
    adName: link.adName,
    adId: link.adId,
    inboundSourceChannel: link.sourceChannel,
  };
}

export function snapshotToLeadFields(
  snapshot: AdApplyLinkSnapshot,
): Record<string, string | null> {
  return {
    adApplyLinkId: snapshot.adApplyLinkId,
    applyLinkName: snapshot.applyLinkName,
    landingPageVersion: snapshot.landingPageVersion,
    adCampaignName: snapshot.adCampaignName,
    adCampaignId: snapshot.adCampaignId,
    adSetName: snapshot.adSetName,
    adSetId: snapshot.adSetId,
    adName: snapshot.adName,
    adId: snapshot.adId,
    inboundSourceChannel: snapshot.inboundSourceChannel,
  };
}
