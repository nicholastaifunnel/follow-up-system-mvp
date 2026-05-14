import Link from "next/link";
import {
  REPLY_TYPE_OPTIONS,
  type ReplyTypeId,
} from "@/app/leads/[id]/reply-assistant/sopReplies";
import { prisma } from "@/lib/prisma";
import { ReplySopTemplateRow } from "./ReplySopTemplateRow";

export const dynamic = "force-dynamic";

const LANG_ORDER = ["en", "zh"] as const;
const LANG_TITLE: Record<string, string> = {
  en: "English",
  zh: "中文",
};

function orderKeyIndex(key: string): number {
  const idx = REPLY_TYPE_OPTIONS.findIndex((o) => o.id === (key as ReplyTypeId));
  return idx === -1 ? 999 : idx;
}

type SopRow = {
  id: string;
  key: string;
  language: string;
  label: string;
  body: string;
};

function groupByLanguage(rows: SopRow[]): Map<string, SopRow[]> {
  const map = new Map<string, SopRow[]>();
  for (const row of rows) {
    const list = map.get(row.language) ?? [];
    list.push(row);
    map.set(row.language, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => orderKeyIndex(a.key) - orderKeyIndex(b.key));
  }
  return map;
}

function languageSectionOrder(grouped: Map<string, SopRow[]>): string[] {
  const rest = [...grouped.keys()]
    .filter((lang) => !LANG_ORDER.includes(lang as (typeof LANG_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...LANG_ORDER.filter((l) => grouped.has(l)), ...rest];
}

export default async function ReplySopSettingsPage() {
  const rows = await prisma.replySopTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ language: "asc" }, { key: "asc" }],
    select: {
      id: true,
      key: true,
      language: true,
      label: true,
      body: true,
    },
  });

  const grouped = groupByLanguage(rows);
  const sectionLangs = languageSectionOrder(grouped);

  return (
    <div className="page reply-sop-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          ← Queues
        </Link>
      </p>
      <header className="lead-header">
        <h1>Reply SOP Settings</h1>
        <p className="sub">
          Edit reply bodies used by Reply Assistant. Changes apply to all leads on the next load.
        </p>
      </header>

      {sectionLangs.map((lang) => {
        const list = grouped.get(lang) ?? [];
        if (list.length === 0) return null;
        const title = LANG_TITLE[lang] ?? lang;
        return (
          <section className="section reply-sop-lang-section" key={lang}>
            <h2>{title}</h2>
            <div className="reply-sop-grid">
              {list.map((t) => (
                <ReplySopTemplateRow
                  key={t.id}
                  id={t.id}
                  typeLabel={t.label}
                  body={t.body}
                />
              ))}
            </div>
          </section>
        );
      })}

      {rows.length === 0 ? (
        <p className="empty">
          No reply SOP templates in the database yet. Run{" "}
          <code>npm run reply-sop:sync</code> after applying the schema.
        </p>
      ) : null}
    </div>
  );
}
