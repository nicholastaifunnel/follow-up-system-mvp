"use client";

import { CopyUrlButton } from "./CopyUrlButton";

export type LandingPageEntry = {
  name: string;
  landingPath: string;
  applyPath: string;
  audience: string;
  purpose: string;
  status: string;
};

type Props = {
  page: LandingPageEntry;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ad-apply-detail-row">
      <span className="ad-apply-detail-label">{label}</span>
      <span className="ad-apply-detail-value">{value}</span>
    </div>
  );
}

export function LandingPageCard({ page }: Props) {
  const isActive = page.status.toLowerCase() === "active";

  return (
    <article
      className={`ad-apply-link-card${isActive ? "" : " ad-apply-link-card--inactive"}`}
    >
      <div className="ad-apply-link-card-head">
        <div>
          <h3 className="ad-apply-link-name">{page.name}</h3>
          <p className="sub ad-apply-link-meta">
            <span
              className={`ad-apply-status-pill${isActive ? "" : " ad-apply-status-pill--inactive"}`}
            >
              {page.status}
            </span>
          </p>
        </div>
      </div>

      <div className="ad-apply-section">
        <div className="ad-apply-detail-grid">
          <DetailRow label="Audience" value={page.audience} />
          <DetailRow label="Purpose" value={page.purpose} />
        </div>
      </div>

      <div className="ad-apply-section">
        <h4 className="ad-apply-section-title">Flow</h4>
        <p className="sub">
          Ad → Landing Page → Apply Form / Modal → Thank You → WhatsApp Confirmation
        </p>
      </div>

      <div className="ad-apply-section ad-apply-form-link-section">
        <h4 className="ad-apply-section-title">Landing Page URL</h4>
        <p className="ad-apply-full-form-link">
          <code>{page.landingPath}</code>
        </p>
        <div className="ad-apply-form-link-actions">
          <a
            className="queue-limit-pill"
            href={page.landingPath}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Landing Page
          </a>
          <CopyUrlButton path={page.landingPath} label="Copy Landing Page URL" />
        </div>
      </div>

      <div className="ad-apply-section ad-apply-form-link-section">
        <h4 className="ad-apply-section-title">Apply Form URL</h4>
        <p className="ad-apply-full-form-link">
          <code>{page.applyPath}</code>
        </p>
        <div className="ad-apply-form-link-actions">
          <a
            className="queue-limit-pill"
            href={page.applyPath}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Apply Form
          </a>
          <CopyUrlButton path={page.applyPath} label="Copy Apply Form URL" />
        </div>
      </div>
    </article>
  );
}
