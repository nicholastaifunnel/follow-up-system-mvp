"use client";

import { useState, useTransition } from "react";
import type { AdApplyLink } from "@prisma/client";
import { AdApplyLinkForm } from "./AdApplyLinkForm";
import { CopyApplyLinkButton } from "./CopyApplyLinkButton";
import { toggleAdApplyLinkActiveAction } from "./actions";

type Props = {
  link: AdApplyLink;
  fullFormLink: string;
};

function dash(v: string | null | undefined): string {
  return v && v.trim() ? v.trim() : "—";
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  const text = dash(value);
  return (
    <div className="ad-apply-detail-row">
      <span className="ad-apply-detail-label">{label}</span>
      <span className="ad-apply-detail-value">
        {href && value?.trim() ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ) : (
          text
        )}
      </span>
    </div>
  );
}

export function AdApplyLinkRow({ link, fullFormLink }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const relativePath = `/apply/${link.slug}`;

  return (
    <article className={`ad-apply-link-card${link.isActive ? "" : " ad-apply-link-card--inactive"}`}>
      <div className="ad-apply-link-card-head">
        <div>
          <h3 className="ad-apply-link-name">{link.name}</h3>
          <p className="sub ad-apply-link-meta">
            Slug: <code>{link.slug}</code>
            {" · "}
            <span className={`ad-apply-status-pill${link.isActive ? "" : " ad-apply-status-pill--inactive"}`}>
              {link.isActive ? "Active" : "Inactive"}
            </span>
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

      <div className="ad-apply-section">
        <h4 className="ad-apply-section-title">Main</h4>
        <div className="ad-apply-detail-grid">
          <DetailRow label="Link name" value={link.name} />
          <DetailRow label="Industry" value={link.industry} />
        </div>
      </div>

      <div className="ad-apply-section">
        <h4 className="ad-apply-section-title">Landing page</h4>
        <div className="ad-apply-detail-grid">
          <DetailRow label="Landing page name" value={link.landingPageName} />
          <DetailRow
            label="Landing page URL"
            value={link.landingPageUrl}
            href={link.landingPageUrl}
          />
          <DetailRow label="Landing page version" value={link.landingPageVersion} />
          <DetailRow label="Placement page" value={link.placementPage} />
        </div>
      </div>

      <div className="ad-apply-section">
        <h4 className="ad-apply-section-title">Ads tracking</h4>
        <div className="ad-apply-detail-grid">
          <DetailRow label="Campaign name" value={link.campaignName} />
          <DetailRow label="Campaign ID" value={link.campaignId} />
          <DetailRow label="Ad set name" value={link.adSetName} />
          <DetailRow label="Ad set ID" value={link.adSetId} />
          <DetailRow label="Ad name" value={link.adName} />
          <DetailRow label="Ad ID" value={link.adId} />
        </div>
      </div>

      <div className="ad-apply-section ad-apply-form-link-section">
        <h4 className="ad-apply-section-title">Form link</h4>
        <p className="ad-apply-full-form-link">
          <code>{fullFormLink}</code>
        </p>
        <div className="ad-apply-form-link-actions">
          <a
            className="queue-limit-pill"
            href={relativePath}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open form
          </a>
          <CopyApplyLinkButton url={fullFormLink} />
        </div>
      </div>

      {editing ? (
        <AdApplyLinkForm link={link} onSaved={() => setEditing(false)} />
      ) : null}
    </article>
  );
}
