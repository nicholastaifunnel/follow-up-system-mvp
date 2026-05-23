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
      <fieldset className="ad-form-fieldset">
        <legend>Link identity</legend>
        <div className="ad-form-grid">
          <label>
            Link name *
            <input
              name="name"
              required
              placeholder="e.g. Beauty LP V1 - Pain Point"
              defaultValue={link?.name ?? ""}
            />
          </label>
          <label>
            Slug {link ? "" : "(optional)"}
            <input
              name="slug"
              placeholder="auto-generated if empty"
              defaultValue={link?.slug ?? ""}
            />
          </label>
        </div>
      </fieldset>
      <fieldset className="ad-form-fieldset">
        <legend>Landing page (optional — can fill later)</legend>
        <div className="ad-form-grid">
          <label>
            Industry
            <input name="industry" placeholder="e.g. Beauty" defaultValue={link?.industry ?? ""} />
          </label>
          <label>
            Landing page name
            <input
              name="landingPageName"
              placeholder="Full landing page title"
              defaultValue={link?.landingPageName ?? ""}
            />
          </label>
          <label>
            Landing page URL
            <input
              name="landingPageUrl"
              placeholder="https://…"
              defaultValue={link?.landingPageUrl ?? ""}
            />
          </label>
          <label>
            Landing page version
            <input
              name="landingPageVersion"
              placeholder="V1 / V2 / V3"
              defaultValue={link?.landingPageVersion ?? ""}
            />
          </label>
          <label className="ad-form-grid-span2">
            Placement page
            <input
              name="placementPage"
              placeholder="Which page / funnel step hosts this form"
              defaultValue={link?.placementPage ?? ""}
            />
          </label>
        </div>
      </fieldset>
      <fieldset className="ad-form-fieldset">
        <legend>Facebook Ads (optional — can fill later)</legend>
        <div className="ad-form-grid">
          <label>
            Source channel
            <input name="sourceChannel" defaultValue={link?.sourceChannel ?? "Facebook Ads"} />
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
      </fieldset>
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
