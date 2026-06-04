"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  buildCleanedDownloadBaseName,
  buildStandardTemplateCsv,
  buildStandardTemplateExcelBuffer,
  convertGosomRowsToStandardRows,
  downloadBlob,
  filterKeepOnlyRows,
  isExcludeOrDuplicateFilterStatus,
  isKeepFilterStatus,
  isReviewFilterStatus,
  LEAD_TEMPLATE_SOURCE_OPTIONS,
  parseGosomCsvBuffer,
  type ConvertLeadTemplateResult,
  type StandardLeadTemplateColumn,
  type StandardLeadTemplateRow,
} from "@/lib/leadTemplateConverter";

const PREVIEW_LIMIT = 20;

const PREVIEW_COLUMNS: StandardLeadTemplateColumn[] = [
  "Filter Status",
  "Filter Reason",
  "Business Name",
  "Phone",
  "WhatsApp Phone",
  "Category",
  "Area",
  "Website",
  "Social Link",
  "Rating",
  "Review Count",
  "Google Maps Link",
];

type PreviewTabId = "all" | "keep" | "review" | "exclude";

const BEAUTY_SPA_EXCLUDE_KEYWORDS = [
  "ENT",
  "ear nose throat",
  "otolaryngologist",
  "clinic",
  "klinik",
  "medical clinic",
  "specialist",
  "doctor",
  "dr.",
  "hospital",
  "health consultant",
  "hearing",
  "hearing aid",
  "hearing test",
  "audiology",
  "audiologist",
  "pharmacy",
  "guardian",
  "watsons",
  "big pharmacy",
  "caring pharmacy",
  "dental",
  "dentist",
  "orthodontist",
  "physiotherapy",
  "physio",
  "chiropractic",
  "chiropractor",
  "veterinary",
  "vet",
  "animal clinic",
  "optical",
  "optometrist",
  "eye specialist",
  "foot reflexology",
  "thai massage",
  "traditional massage",
  "tuina",
  "urutan",
  "massage centre",
].join("\n");

function fmt(v: string): string {
  return v && v.trim() ? v : "—";
}

function filterRowsByTab(rows: StandardLeadTemplateRow[], tab: PreviewTabId): StandardLeadTemplateRow[] {
  switch (tab) {
    case "keep":
      return rows.filter((row) => isKeepFilterStatus(row["Filter Status"]));
    case "review":
      return rows.filter((row) => isReviewFilterStatus(row["Filter Status"]));
    case "exclude":
      return rows.filter((row) => isExcludeOrDuplicateFilterStatus(row["Filter Status"]));
    default:
      return rows;
  }
}

export function LeadTemplateConverterClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("gosom_google_maps_scraper");
  const [sourceKeyword, setSourceKeyword] = useState("");
  const [areaOverride, setAreaOverride] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [excludeKeywordsText, setExcludeKeywordsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertLeadTemplateResult | null>(null);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTabId>("all");

  function clearPreview() {
    setResult(null);
    setError(null);
  }

  function onCleanAndPreview() {
    setError(null);
    setResult(null);
    setActiveTab("all");

    if (!file) {
      setError("Please upload a CSV file first.");
      return;
    }
    if (!sourceKeyword.trim()) {
      setError("Source Keyword is required.");
      return;
    }

    setPending(true);
    void file
      .arrayBuffer()
      .then((buffer) => {
        const gosomRows = parseGosomCsvBuffer(buffer);
        if (gosomRows.length === 0) {
          setError("No data rows found in this CSV.");
          return;
        }
        const converted = convertGosomRowsToStandardRows(gosomRows, {
          source,
          sourceKeyword: sourceKeyword.trim(),
          sourceFileName: file.name,
          areaOverride: areaOverride.trim() || undefined,
          campaignNameOverride: campaignName.trim() || undefined,
          excludeKeywordsText,
        });
        setResult(converted);
      })
      .catch(() => {
        setError("Could not read this CSV file. Check the format and try again.");
      })
      .finally(() => {
        setPending(false);
      });
  }

  function downloadRows(rows: StandardLeadTemplateRow[], base: string, format: "csv" | "xlsx") {
    if (format === "csv") {
      const csv = buildStandardTemplateCsv(rows);
      downloadBlob(`${base}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
      return;
    }
    const buffer = buildStandardTemplateExcelBuffer(rows);
    downloadBlob(
      `${base}.xlsx`,
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
  }

  function onDownloadKeep(format: "csv" | "xlsx") {
    if (!result) return;
    const base = buildCleanedDownloadBaseName("keep", sourceKeyword);
    downloadRows(filterKeepOnlyRows(result.rows), base, format);
  }

  function onDownloadAll(format: "csv" | "xlsx") {
    if (!result) return;
    const base = buildCleanedDownloadBaseName("all", sourceKeyword);
    downloadRows(result.rows, base, format);
  }

  const tabCounts = useMemo(() => {
    if (!result) {
      return { all: 0, keep: 0, review: 0, exclude: 0 };
    }
    const rows = result.rows;
    return {
      all: rows.length,
      keep: rows.filter((r) => isKeepFilterStatus(r["Filter Status"])).length,
      review: rows.filter((r) => isReviewFilterStatus(r["Filter Status"])).length,
      exclude: rows.filter((r) => isExcludeOrDuplicateFilterStatus(r["Filter Status"])).length,
    };
  }, [result]);

  const tabRows = useMemo(() => {
    if (!result) return [];
    return filterRowsByTab(result.rows, activeTab);
  }, [result, activeTab]);

  const previewRows = tabRows.slice(0, PREVIEW_LIMIT);

  return (
    <div className="page lead-template-converter-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          ← Queues
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/import">
          Import Excel
        </Link>
      </p>

      <h1>Lead Cleaner &amp; Template Converter</h1>
      <p className="sub">
        Clean scraper CSV, filter low-quality leads, and export a standard Follow-up System
        template.
      </p>

      <section className="lead-template-converter-section">
        <h2 className="lead-template-converter-heading">Upload CSV</h2>
        <div className="lead-template-converter-field">
          <label htmlFor="ltc-csv-file">CSV file (.csv)</label>
          <input
            ref={fileRef}
            id="ltc-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              clearPreview();
            }}
          />
          {file ? (
            <p className="lead-template-converter-hint">Selected: {file.name}</p>
          ) : null}
        </div>
      </section>

      <section className="lead-template-converter-section">
        <h2 className="lead-template-converter-heading">Batch Settings</h2>
        <p className="lead-template-converter-hint">
          Exclude irrelevant businesses first. Remaining rows enter Keep or Review based on contact
          quality.
        </p>
        <div className="lead-template-converter-grid">
          <label className="lead-template-converter-field">
            Source
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                clearPreview();
              }}
            >
              {LEAD_TEMPLATE_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="lead-template-converter-field">
            Source Keyword *
            <input
              type="text"
              value={sourceKeyword}
              placeholder="e.g. spa"
              onChange={(e) => {
                setSourceKeyword(e.target.value);
                clearPreview();
              }}
            />
          </label>
          <label className="lead-template-converter-field">
            Area (optional)
            <input
              type="text"
              value={areaOverride}
              placeholder="e.g. Johor Bahru"
              onChange={(e) => {
                setAreaOverride(e.target.value);
                clearPreview();
              }}
            />
          </label>
          <label className="lead-template-converter-field lead-template-converter-field-full">
            Campaign Name (optional)
            <input
              type="text"
              value={campaignName}
              placeholder="e.g. 2026-06 Johor Bahru Ear Cleaning"
              onChange={(e) => {
                setCampaignName(e.target.value);
                clearPreview();
              }}
            />
          </label>
          <label className="lead-template-converter-field lead-template-converter-field-full">
            Exclude Keywords
            <button
              type="button"
              className="import-preview-btn"
              onClick={() => {
                setExcludeKeywordsText(BEAUTY_SPA_EXCLUDE_KEYWORDS);
                clearPreview();
              }}
            >
              Use Beauty/Spa Exclude Keywords
            </button>
            <textarea
              value={excludeKeywordsText}
              rows={6}
              placeholder={"ENT\nclinic\nklinik\npharmacy\nhearing aid"}
              onChange={(e) => {
                setExcludeKeywordsText(e.target.value);
                clearPreview();
              }}
            />
          </label>
        </div>
        <button
          type="button"
          className="import-preview-btn lead-template-converter-convert-btn"
          disabled={pending}
          onClick={onCleanAndPreview}
        >
          {pending ? "Cleaning…" : "Clean & Preview"}
        </button>
      </section>

      {error ? (
        <p className="import-error lead-template-converter-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <section className="lead-template-converter-section">
            <h2 className="lead-template-converter-heading">Cleaning Summary</h2>
            <div className="lead-template-converter-summary">
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Total Rows</span>
                <span>{result.summary.totalRows}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Keep - Queue Ready</span>
                <span>{result.summary.keepQueueReady}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">
                  Keep - No Phone but Has Web/Social
                </span>
                <span>{result.summary.keepNoPhoneButHasWebSocial}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Review</span>
                <span>{result.summary.review}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Exclude - Irrelevant</span>
                <span>{result.summary.excludeIrrelevant}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">
                  Exclude - No Contact Info
                </span>
                <span>{result.summary.excludeNoContactInfo}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Duplicates</span>
                <span>{result.summary.duplicate}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Missing Phone</span>
                <span>{result.summary.missingPhone}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Missing Website</span>
                <span>{result.summary.missingWebsite}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Missing Social Link</span>
                <span>{result.summary.missingSocialLink}</span>
              </div>
            </div>
          </section>

          <section className="lead-template-converter-section">
            <h2 className="lead-template-converter-heading">Preview Converted Rows</h2>
            <div className="lead-template-converter-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "all"}
                className={
                  activeTab === "all"
                    ? "lead-template-converter-tab lead-template-converter-tab-active"
                    : "lead-template-converter-tab"
                }
                onClick={() => setActiveTab("all")}
              >
                All ({tabCounts.all})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "keep"}
                className={
                  activeTab === "keep"
                    ? "lead-template-converter-tab lead-template-converter-tab-active"
                    : "lead-template-converter-tab"
                }
                onClick={() => setActiveTab("keep")}
              >
                Keep ({tabCounts.keep})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "review"}
                className={
                  activeTab === "review"
                    ? "lead-template-converter-tab lead-template-converter-tab-active"
                    : "lead-template-converter-tab"
                }
                onClick={() => setActiveTab("review")}
              >
                Review ({tabCounts.review})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "exclude"}
                className={
                  activeTab === "exclude"
                    ? "lead-template-converter-tab lead-template-converter-tab-active"
                    : "lead-template-converter-tab"
                }
                onClick={() => setActiveTab("exclude")}
              >
                Exclude / Duplicate ({tabCounts.exclude})
              </button>
            </div>
            <p className="sub lead-template-converter-preview-note">
              Showing up to {PREVIEW_LIMIT} of {tabRows.length} rows in this tab.
            </p>
            <div className="table-wrap lead-template-converter-table-wrap">
              <table className="queue lead-template-converter-table">
                <thead>
                  <tr>
                    {PREVIEW_COLUMNS.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {PREVIEW_COLUMNS.map((col) => (
                        <td key={col} className="lead-template-converter-td-clip">
                          {fmt(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="lead-template-converter-section">
            <h2 className="lead-template-converter-heading">Download Cleaned Template</h2>
            <p className="lead-template-converter-download-group-label">Keep Only</p>
            <div className="lead-template-converter-downloads">
              <button
                type="button"
                className="import-preview-btn"
                onClick={() => onDownloadKeep("csv")}
              >
                Download Keep Only CSV
              </button>
              <button
                type="button"
                className="import-confirm-btn"
                onClick={() => onDownloadKeep("xlsx")}
              >
                Download Keep Only Excel
              </button>
            </div>
            <p className="lead-template-converter-download-group-label">All Cleaned Rows</p>
            <div className="lead-template-converter-downloads">
              <button
                type="button"
                className="import-preview-btn"
                onClick={() => onDownloadAll("csv")}
              >
                Download All Cleaned CSV
              </button>
              <button
                type="button"
                className="import-confirm-btn"
                onClick={() => onDownloadAll("xlsx")}
              >
                Download All Cleaned Excel
              </button>
            </div>
            <p className="sub lead-template-converter-download-hint">
              Use Excel download for checking/editing phone numbers and CID. CSV is for system
              import. Opening CSV in Excel may still auto-format long numbers.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
