"use client";

import { useState, useTransition } from "react";
import type { AdApplyLink } from "@prisma/client";
import { AdApplyLinkForm } from "./AdApplyLinkForm";
import { toggleAdApplyLinkActiveAction } from "./actions";

type Props = {
  link: AdApplyLink;
};

function dash(v: string | null | undefined): string {
  return v && v.trim() ? v.trim() : "—";
}

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
            <span className={`ad-apply-status-pill${link.isActive ? "" : " ad-apply-status-pill--inactive"}`}>
              {link.isActive ? "Active" : "Inactive"}
            </span>
            {" · "}
            Industry: {dash(link.industry)}
            {" · "}
            LP: {dash(link.landingPageVersion)}
            {" · "}
            Campaign: {dash(link.campaignName)}
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
        Slug: <code>{link.slug}</code>
        {" · "}
        Form:{" "}
        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
          {publicUrl}
        </a>
      </p>
      {link.landingPageName || link.placementPage ? (
        <p className="sub ad-apply-campaign-hint">
          {[link.landingPageName, link.placementPage ? `Placement: ${link.placementPage}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {editing ? (
        <AdApplyLinkForm link={link} onSaved={() => setEditing(false)} />
      ) : null}
    </article>
  );
}
