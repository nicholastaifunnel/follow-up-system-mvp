"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import {
  previewExcelFileAction,
  type PreviewExcelFileActionResult,
} from "./actions";

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

export default function ImportExcelPage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PreviewExcelFileActionResult | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setResult(null);
    startTransition(() => {
      void previewExcelFileAction(fd).then(setResult);
    });
  }

  return (
    <div className="page import-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          ← Queues
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/">
          Home
        </Link>
      </p>

      <h1>Import Excel</h1>
      <p className="sub">
        Upload an Excel file to preview leads before importing.
      </p>

      <form className="import-form" onSubmit={onSubmit}>
        <div className="import-form-row">
          <label className="import-form-label" htmlFor="excel-file">
            Excel file (.xlsx)
          </label>
          <input
            id="excel-file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={isPending}
          />
        </div>
        <button type="submit" className="import-preview-btn" disabled={isPending}>
          {isPending ? "Previewing…" : "Preview"}
        </button>
      </form>

      {result && !result.ok ? (
        <p className="import-error" role="alert">
          {result.error}
        </p>
      ) : null}

      {result && result.ok ? (
        <div className="import-preview">
          <section className="detail-card">
            <h2>Campaign preview</h2>
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">Suggested campaign name</span>
                <span className="kv-value">
                  {fmtText(result.data.campaign.suggestedCampaignName)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Source keyword</span>
                <span className="kv-value">
                  {fmtText(result.data.campaign.sourceKeyword)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Area</span>
                <span className="kv-value">{fmtText(result.data.campaign.area)}</span>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <h2>Summary</h2>
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">Total rows</span>
                <span className="kv-value">{result.data.summary.totalRows}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows with phone</span>
                <span className="kv-value">{result.data.summary.rowsWithPhone}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows without phone</span>
                <span className="kv-value">{result.data.summary.rowsWithoutPhone}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows with website</span>
                <span className="kv-value">{result.data.summary.rowsWithWebsite}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows without website</span>
                <span className="kv-value">{result.data.summary.rowsWithoutWebsite}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Suitable leads</span>
                <span className="kv-value">{result.data.summary.suitableLeadCount}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">High priority leads</span>
                <span className="kv-value">{result.data.summary.highPriorityCount}</span>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <h2>Breakdown</h2>
            <h3 className="import-subh">Suggested industry</h3>
            <ul className="import-breakdown-list">
              {Object.entries(result.data.industryCounts).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
            <h3 className="import-subh">Lead level</h3>
            <ul className="import-breakdown-list">
              {Object.entries(result.data.leadLevelCounts).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
            <h3 className="import-subh">Outreach readiness</h3>
            <ul className="import-breakdown-list">
              {Object.entries(result.data.outreachReadinessCounts).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-card">
            <h2>
              Preview rows (first {result.data.previewRows.length} of sheet &quot;
              {result.data.sheetName}&quot;)
            </h2>
            <div className="table-wrap">
              <table className="queue import-preview-table">
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Phone</th>
                    <th>Intl Phone</th>
                    <th>Area</th>
                    <th>Website</th>
                    <th>Google Category</th>
                    <th>Suggested Industry</th>
                    <th>Assigned Industry</th>
                    <th>Lead Level</th>
                    <th>Outreach Readiness</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.previewRows.map((r, i) => (
                    <tr key={`${r.businessName}-${i}`}>
                      <td>{fmtText(r.businessName)}</td>
                      <td>{fmtText(r.phone)}</td>
                      <td>{fmtText(r.internationalPhone)}</td>
                      <td>{fmtText(r.area)}</td>
                      <td>{fmtText(r.website)}</td>
                      <td>{fmtText(r.googleCategory)}</td>
                      <td>{fmtText(r.suggestedIndustry)}</td>
                      <td>—</td>
                      <td>{fmtText(r.leadLevel)}</td>
                      <td>{fmtText(r.outreachReadiness)}</td>
                      <td>{fmtText(r.priority)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="import-footnote">Preview only — no database writes.</p>
        </div>
      ) : null}
    </div>
  );
}
