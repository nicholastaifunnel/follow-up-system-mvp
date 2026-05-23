"use client";

import { useState, useTransition } from "react";
import type { AdApplyLink } from "@prisma/client";
import { AdApplyLinkForm } from "./AdApplyLinkForm";
import { toggleAdApplyLinkActiveAction } from "./actions";

type Props = {
  link: AdApplyLink;
};

export function AdApplyLinkRow({ link }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const publicUrl = `/apply/${link.slug}`;

  return (
    <article className={`ad-apply-link-card${link.isActive ? "" : " ad-apply-link-card--inactive"}`}>
      <div className="ad-apply-link-card-head">
        <div>
          <h3 className="ad-apply-link-name">{link.name}</h3>
          <p className="sub ad-apply-link-meta">
            {link.industry ? `${link.industry} · ` : ""}
            {link.landingPageVersion ? `LP ${link.landingPageVersion} · ` : ""}
            {link.sourceChannel}
            {!link.isActive ? " · Inactive" : ""}
          </p>
        </div>
        <div className="ad-apply-link-actions">
          <button
            type="button"
            className="queue-limit-pill"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            className="queue-limit-pill"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await toggleAdApplyLinkActiveAction(link.id, !link.isActive);
              });
            }}
          >
            {link.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
      <p className="ad-apply-public-url">
        Form:{" "}
        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
          {publicUrl}
        </a>
      </p>
      {link.campaignName || link.adName ? (
        <p className="sub ad-apply-campaign-hint">
          {[link.campaignName, link.adName].filter(Boolean).join(" · ")}
        </p>
      ) : (
        <p className="sub ad-apply-campaign-hint">Campaign / ad details not set yet.</p>
      )}
      {editing ? (
        <AdApplyLinkForm link={link} onSaved={() => setEditing(false)} />
      ) : null}
    </article>
  );
}
