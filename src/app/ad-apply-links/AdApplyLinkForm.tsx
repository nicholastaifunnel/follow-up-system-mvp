"use client";

import { useTransition } from "react";
import type { AdApplyLink } from "@prisma/client";
import { saveAdApplyLinkAction } from "./actions";

type Props = {
  link?: AdApplyLink;
  onSaved?: () => void;
};

export function AdApplyLinkForm({ link, onSaved }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="ad-apply-link-form"
      action={(fd) => {
        startTransition(async () => {
          const result = await saveAdApplyLinkAction(fd);
          if (result.ok) onSaved?.();
          else alert(result.error);
        });
      }}
    >
      {link ? <input type="hidden" name="id" value={link.id} /> : null}
      <div className="ad-form-grid">
        <label>
          Name *
          <input name="name" required defaultValue={link?.name ?? ""} />
        </label>
        <label>
          Slug {link ? "" : "(optional)"}
          <input
            name="slug"
            placeholder="auto-generated if empty"
            defaultValue={link?.slug ?? ""}
          />
        </label>
        <label>
          Industry
          <input name="industry" defaultValue={link?.industry ?? ""} />
        </label>
        <label>
          Landing page name
          <input name="landingPageName" defaultValue={link?.landingPageName ?? ""} />
        </label>
        <label>
          Landing page URL
          <input name="landingPageUrl" type="url" defaultValue={link?.landingPageUrl ?? ""} />
        </label>
        <label>
          LP version
          <input name="landingPageVersion" placeholder="V1" defaultValue={link?.landingPageVersion ?? ""} />
        </label>
        <label>
          Source channel
          <input name="sourceChannel" defaultValue={link?.sourceChannel ?? "Facebook Ads"} />
        </label>
        <label>
          Placement page
          <input name="placementPage" defaultValue={link?.placementPage ?? ""} />
        </label>
        <label>
          Campaign name
          <input name="campaignName" defaultValue={link?.campaignName ?? ""} />
        </label>
        <label>
          Campaign ID
          <input name="campaignId" defaultValue={link?.campaignId ?? ""} />
        </label>
        <label>
          Ad set name
          <input name="adSetName" defaultValue={link?.adSetName ?? ""} />
        </label>
        <label>
          Ad set ID
          <input name="adSetId" defaultValue={link?.adSetId ?? ""} />
        </label>
        <label>
          Ad name
          <input name="adName" defaultValue={link?.adName ?? ""} />
        </label>
        <label>
          Ad ID
          <input name="adId" defaultValue={link?.adId ?? ""} />
        </label>
      </div>
      <label className="ad-form-notes">
        Notes
        <textarea name="notes" rows={2} defaultValue={link?.notes ?? ""} />
      </label>
      <label className="ad-form-checkbox">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={link?.isActive ?? true}
        />
        Active
      </label>
      <button type="submit" className="import-preview-btn" disabled={pending}>
        {pending ? "Saving…" : link ? "Save changes" : "Create link"}
      </button>
    </form>
  );
}
