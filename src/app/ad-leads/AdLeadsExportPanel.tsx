import { getMalaysiaTodayIsoDate } from "@/formatMalaysiaTime";

type LinkOption = { id: string; name: string };

type Props = {
  applyLinks: LinkOption[];
  campaigns: string[];
};

export function AdLeadsExportPanel({ applyLinks, campaigns }: Props) {
  const today = getMalaysiaTodayIsoDate();

  return (
    <section className="section ad-leads-export-section">
      <h2 className="ad-section-heading">Export CSV</h2>
      <p className="sub">
        Rows are filtered by <strong>trial requested date</strong> (MYT), not export
        date.
      </p>
      <form method="get" action="/ad-leads/export" className="ad-leads-export-form">
        <div className="ad-form-grid">
          <label>
            Single day
            <input type="date" name="date" defaultValue={today} />
          </label>
          <label>
            From (range)
            <input type="date" name="dateFrom" />
          </label>
          <label>
            To (range)
            <input type="date" name="dateTo" />
          </label>
          <label>
            Campaign
            <select name="campaignName" defaultValue="">
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Apply link
            <select name="applyLinkId" defaultValue="">
              <option value="">All links</option>
              {applyLinks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="ad-form-checkbox">
          <input type="checkbox" name="approvedOnly" value="1" />
          Approved only
        </label>
        <button type="submit" className="import-preview-btn">
          Download CSV
        </button>
      </form>
      <p className="sub ad-export-hint">
        Use either a single day or a date range. If both are set, single day takes
        priority.
      </p>
    </section>
  );
}
