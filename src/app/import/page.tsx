"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import {
  confirmImportExcelFileAction,
  previewExcelFileAction,
  type ConfirmImportExcelFileActionResult,
  type PreviewExcelFileActionResult,
} from "./actions";

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

export default function ImportExcelPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();
  const [previewResult, setPreviewResult] =
    useState<PreviewExcelFileActionResult | null>(null);
  const [importOutcome, setImportOutcome] =
    useState<ConfirmImportExcelFileActionResult | null>(null);

  const importSucceeded = Boolean(importOutcome?.ok);

  function onPreviewSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPreviewResult(null);
    setImportOutcome(null);
    startPreviewTransition(() => {
      void previewExcelFileAction(fd).then(setPreviewResult);
    });
  }

  function onConfirmImport() {
    const form = formRef.current;
    if (!form) return;
    setImportOutcome(null);
    const fd = new FormData(form);
    startImportTransition(() => {
      void confirmImportExcelFileAction(fd).then(setImportOutcome);
    });
  }

  function onImportAnotherFile() {
    setPreviewResult(null);
    setImportOutcome(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const busy = isPreviewPending || isImportPending;

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
      <p className="sub import-gosom-link">
        Gosom CSV?{" "}
        <Link className="top-link" href="/tools/lead-template-converter">
          Convert to standard template first →
        </Link>
      </p>

      <form
        ref={formRef}
        className="import-form"
        method="post"
        encType="multipart/form-data"
        onSubmit={onPreviewSubmit}
        id="import-excel-form"
      >
        <div className="import-form-row">
          <label className="import-form-label" htmlFor="excel-file">
            Excel file (.xlsx)
          </label>
          <input
            ref={fileInputRef}
            id="excel-file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={busy}
          />
        </div>
        <div className="import-form-actions">
          <button type="submit" className="import-preview-btn" disabled={busy}>
            {isPreviewPending ? "Previewing…" : "Preview"}
          </button>
          {previewResult?.ok ? (
            <button
              type="button"
              className="import-confirm-btn"
              onClick={onConfirmImport}
              disabled={busy || importSucceeded}
            >
              {isImportPending
                ? "Importing..."
                : importSucceeded
                  ? "Imported"
                  : "Confirm Import"}
            </button>
          ) : null}
        </div>
      </form>

      {importOutcome?.ok ? (
        <section
          className="import-success-card"
          role="status"
          aria-live="polite"
        >
          <h2 className="import-success-title">Import completed</h2>
          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-label">Campaign name</span>
              <span className="kv-value">
                {fmtText(importOutcome.data.campaignName)}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Total rows</span>
              <span className="kv-value">{importOutcome.data.totalRows}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Inserted</span>
              <span className="kv-value">{importOutcome.data.insertedCount}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Updated</span>
              <span className="kv-value">{importOutcome.data.updatedCount}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Duplicates</span>
              <span className="kv-value">{importOutcome.data.duplicateCount}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Skipped</span>
              <span className="kv-value">{importOutcome.data.skippedCount}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Missing phone</span>
              <span className="kv-value">{importOutcome.data.missingPhoneCount}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Missing website</span>
              <span className="kv-value">
                {importOutcome.data.missingWebsiteCount}
              </span>
            </div>
          </div>
          <div className="import-success-actions">
            <Link className="import-success-primary-link" href="/queues">
              View Queues
            </Link>
            <button
              type="button"
              className="import-success-secondary-btn"
              onClick={onImportAnotherFile}
            >
              Import Another File
            </button>
          </div>
        </section>
      ) : null}

      {previewResult && !previewResult.ok ? (
        <p className="import-error" role="alert">
          {previewResult.error}
        </p>
      ) : null}

      {importOutcome && !importOutcome.ok ? (
        <p className="import-error" role="alert">
          {importOutcome.error}
        </p>
      ) : null}

      {previewResult?.ok ? (
        <div className="import-preview">
          <section className="detail-card">
            <h2>Campaign preview</h2>
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">Suggested campaign name</span>
                <span className="kv-value">
                  {fmtText(previewResult.data.campaign.suggestedCampaignName)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Source keyword</span>
                <span className="kv-value">
                  {fmtText(previewResult.data.campaign.sourceKeyword)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Area</span>
                <span className="kv-value">
                  {fmtText(previewResult.data.campaign.area)}
                </span>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <h2>Summary</h2>
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">Total rows</span>
                <span className="kv-value">{previewResult.data.summary.totalRows}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows with phone</span>
                <span className="kv-value">
                  {previewResult.data.summary.rowsWithPhone}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows without phone</span>
                <span className="kv-value">
                  {previewResult.data.summary.rowsWithoutPhone}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows with website</span>
                <span className="kv-value">
                  {previewResult.data.summary.rowsWithWebsite}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Rows without website</span>
                <span className="kv-value">
                  {previewResult.data.summary.rowsWithoutWebsite}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Suitable leads</span>
                <span className="kv-value">
                  {previewResult.data.summary.suitableLeadCount}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">High priority leads</span>
                <span className="kv-value">
                  {previewResult.data.summary.highPriorityCount}
                </span>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <h2>Breakdown</h2>
            <h3 className="import-subh">Suggested industry</h3>
            <ul className="import-breakdown-list">
              {Object.entries(previewResult.data.industryCounts).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
            <h3 className="import-subh">Lead level</h3>
            <ul className="import-breakdown-list">
              {Object.entries(previewResult.data.leadLevelCounts).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
            <h3 className="import-subh">Outreach readiness</h3>
            <ul className="import-breakdown-list">
              {Object.entries(previewResult.data.outreachReadinessCounts).map(
                ([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section className="detail-card">
            <h2>
              Preview rows (first {previewResult.data.previewRows.length} of sheet
              &quot;{previewResult.data.sheetName}&quot;)
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
                  {previewResult.data.previewRows.map((r, i) => (
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

          {!importSucceeded ? (
            <p className="import-footnote">
              Preview does not write to the database. Click Confirm Import to import
              leads using the file still selected above.
            </p>
          ) : (
            <p className="import-footnote">
              Import finished — the green summary is above. Use Import Another File
              there to clear this preview and choose a new spreadsheet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
