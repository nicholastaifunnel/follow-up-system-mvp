"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  buildDownloadBaseName,
  buildStandardTemplateCsv,
  buildStandardTemplateExcelBuffer,
  convertGosomRowsToStandardRows,
  downloadBlob,
  LEAD_TEMPLATE_SOURCE_OPTIONS,
  parseGosomCsvBuffer,
  STANDARD_LEAD_TEMPLATE_COLUMNS,
  type ConvertLeadTemplateResult,
  type StandardLeadTemplateRow,
} from "@/lib/leadTemplateConverter";

const PREVIEW_LIMIT = 20;

function fmt(v: string): string {
  return v && v.trim() ? v : "—";
}

export function LeadTemplateConverterClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("gosom_google_maps_scraper");
  const [sourceKeyword, setSourceKeyword] = useState("");
  const [areaOverride, setAreaOverride] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertLeadTemplateResult | null>(null);
  const [pending, setPending] = useState(false);

  function onConvert() {
    setError(null);
    setResult(null);

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

  function onDownloadCsv() {
    if (!result) return;
    const base = buildDownloadBaseName(sourceKeyword);
    const csv = buildStandardTemplateCsv(result.rows);
    downloadBlob(`${base}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
  }

  function onDownloadExcel() {
    if (!result) return;
    const base = buildDownloadBaseName(sourceKeyword);
    const buffer = buildStandardTemplateExcelBuffer(result.rows);
    downloadBlob(
      `${base}.xlsx`,
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
  }

  const previewRows: StandardLeadTemplateRow[] =
    result?.rows.slice(0, PREVIEW_LIMIT) ?? [];

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

      <h1>Lead Template Converter</h1>
      <p className="sub">
        Convert gosom / external scraper CSV into the standard Follow-up System lead
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
              setResult(null);
              setError(null);
            }}
          />
          {file ? (
            <p className="lead-template-converter-hint">Selected: {file.name}</p>
          ) : null}
        </div>
      </section>

      <section className="lead-template-converter-section">
        <h2 className="lead-template-converter-heading">Source Settings</h2>
        <div className="lead-template-converter-grid">
          <label className="lead-template-converter-field">
            Source
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
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
              placeholder="e.g. beauty salon johor bahru"
              onChange={(e) => setSourceKeyword(e.target.value)}
            />
          </label>
          <label className="lead-template-converter-field">
            Area (optional)
            <input
              type="text"
              value={areaOverride}
              placeholder="e.g. johor bahru"
              onChange={(e) => setAreaOverride(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="import-preview-btn lead-template-converter-convert-btn"
          disabled={pending}
          onClick={onConvert}
        >
          {pending ? "Converting…" : "Convert Preview"}
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
            <h2 className="lead-template-converter-heading">Conversion Summary</h2>
            <div className="lead-template-converter-summary">
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Total rows</span>
                <span>{result.summary.totalRows}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Converted rows</span>
                <span>{result.summary.convertedRows}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Missing business name</span>
                <span>{result.summary.missingBusinessName}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Missing phone</span>
                <span>{result.summary.missingPhone}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Website count</span>
                <span>{result.summary.websiteCount}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Social link count</span>
                <span>{result.summary.socialLinkCount}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">Mobile WhatsApp count</span>
                <span>{result.summary.mobileWhatsAppCount}</span>
              </div>
              <div className="lead-template-converter-stat">
                <span className="lead-template-converter-stat-label">
                  Landline / not WhatsApp
                </span>
                <span>{result.summary.landlineOrNotWhatsAppCount}</span>
              </div>
            </div>
          </section>

          <section className="lead-template-converter-section">
            <h2 className="lead-template-converter-heading">Preview Converted Rows</h2>
            <p className="sub lead-template-converter-preview-note">
              Showing up to {PREVIEW_LIMIT} of {result.rows.length} rows.
            </p>
            <div className="table-wrap lead-template-converter-table-wrap">
              <table className="queue lead-template-converter-table">
                <thead>
                  <tr>
                    {STANDARD_LEAD_TEMPLATE_COLUMNS.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {STANDARD_LEAD_TEMPLATE_COLUMNS.map((col) => (
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
            <h2 className="lead-template-converter-heading">Download Standard Template</h2>
            <div className="lead-template-converter-downloads">
              <button
                type="button"
                className="import-preview-btn"
                onClick={onDownloadCsv}
              >
                Download Standard CSV
              </button>
              <button
                type="button"
                className="import-confirm-btn"
                onClick={onDownloadExcel}
              >
                Download Standard Excel
              </button>
            </div>
            <p className="sub" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
              For editing in Excel, use Standard Excel. CSV is for system import.
              Opening CSV in Excel may still auto-format long numbers.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
