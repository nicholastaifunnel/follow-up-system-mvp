# Follow-up System MVP

This is the sales, lead cleaning, import, WhatsApp follow-up, trial tracking, and renewal workspace for the Review QR System.

It is **not** the Review Assistant customer review collection app itself. That is a separate customer-facing review flow (for example `/r` on the merchant side). This repo is the internal operations workspace.

---

## What this system does

- Clean external leads from scrapers (for example Gosom / Google Maps exports)
- Import leads into the database
- Review and approve leads before outreach
- Prepare WhatsApp messages (copy/paste workflow)
- Track outreach, replies, and follow-up status
- Manage Review QR free trials, renewals, and related follow-up

There is **no** automated WhatsApp sending, webhooks, or AI bot in this MVP.

---

## Core funnel

```
External leads (Gosom / Google Maps / Excel)
    → Lead Cleaner (/tools/lead-template-converter)
    → Keep Only Excel
    → Import (/import)
    → Lead Review Inbox (/queues)
    → Approve
    → Message Queue (/queues)
    → Manual WhatsApp outreach (lead detail page)
    → Apply Form (/apply/[slug]) — for ad / trial intake
    → Free Trial tracking
    → Review Follow-up / Renewal (/review-trials)
```

---

## Main routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/queues` | Auth (if configured) | Main workspace: Lead Review Inbox, Today's Action Queue, filters, phone search |
| `/leads/[id]` | Auth | Single lead: review, prepare message, WhatsApp phone, skip, trial fields |
| `/leads/[id]/reply-assistant` | Auth | SOP-based reply helper for a lead |
| `/import` | Auth | Preview and import `.xlsx` lead files |
| `/tools/lead-template-converter` | Auth | Lead Cleaner: clean Gosom CSV in the browser |
| `/message-templates` | Auth | Message template presets and templates |
| `/reply-sop` | Auth | Reply SOP template settings |
| `/review-trials` | Auth | Review QR trial and renewal follow-up |
| `/skipped-leads` | Auth | Leads hidden from message queue |
| `/system-health` | Auth | High-level counts and health summary |
| `/ad-apply-links` | Auth | Manage apply-form slugs for ads |
| `/landing-pages` | Auth | Directory for ad landing page links and connected apply forms |
| `/ad-leads` | Auth | Leads from ad apply forms |
| `/review-qr-system` | **Public** | Review QR marketing landing page |
| `/apply/[slug]` | **Public** | Free trial application form |
| `/apply/[slug]/thank-you` | **Public** | Thank-you page after apply submit |
| `/login` | **Public** | Internal password sign-in |

**Auth:** When `APP_PASSWORD` and `AUTH_COOKIE_SECRET` are set, middleware protects internal routes and redirects to `/login`. Public routes stay open without login.

**Home:** `/` redirects to `/queues`.

---

## Stable status as of 2026-06

Verified on `main`:

- **Lead Cleaner** — exclude-only mode, production tested
- **Import** — maps key Lead Cleaner Keep Only Excel fields (`WhatsApp Phone`, `Rating`, `Notes`)
- **Queues** — new imports go to **Lead Review Inbox** first; outreach uses **Approve** before Message Queue

Important commits:

| Commit | Summary |
|--------|---------|
| `bbad02b` | Switch lead cleaner to exclude-only mode |
| `c185a13` | Document lead cleaner exclude-only mode |
| `41fb15c` | Support lead cleaner fields in Excel import |

---

## Lead Cleaner

- **Route:** `/tools/lead-template-converter`
- **Type:** Browser-only tool (no database writes)
- **Input:** Gosom-style CSV upload
- **Output:** 20-column standard template
- **Mode:** Exclude-only (Keep Keywords UI removed)
- **Exclude Keywords:** Editable; **Use Beauty/Spa Exclude Keywords** preset available
- **Downloads:** Keep Only (CSV/Excel) and All Cleaned (CSV/Excel)
- Changing settings clears the previous preview until you run **Clean & Preview** again

Full details: [docs/lead-cleaner.md](docs/lead-cleaner.md)

---

## Excel import

- **Route:** `/import`
- **Format:** `.xlsx` only (not CSV)
- **Use:** Import **Keep Only** Excel from Lead Cleaner — do **not** import All Cleaned files for outreach
- **Lead Cleaner field mapping:**
  - `WhatsApp Phone` → `Lead.whatsappPhone`
  - `Rating` (if no `Google Rating`) → `googleRating`
  - `Notes` (if no `Manual Notes`) → `manualNotes`
- **Dedupe (update existing, not duplicate rows):** `placeId` → `businessName` + phone → `businessName` + area
- **New leads:** `outreachReadiness` = Needs Review — review in Lead Review Inbox before outreach
- **Does not** auto-send WhatsApp or auto-approve leads

---

## Queue and outreach workflow

1. **Lead Review Inbox** (`/queues`) — review imported leads first
2. **Approve** — only approved (Ready) leads enter first-outreach queues
3. **Prepare First Message** — manual preparation on lead detail
4. **Send** — open WhatsApp manually (`wa.me` link); mark sent when done
5. **Follow-up** — use queue sections and lead detail for replies and follow-ups

**Safety:** Prepare and send in small batches. Avoid mass-sending many first messages at once.

---

## Review QR / Ad flow

- **`/landing-pages`** — internal directory for finding and copying ad landing page URLs
- **`/review-qr-system`** — public marketing page for Review QR (beauty / spa / salon)
- **`/apply/[slug]`** — public free trial application (slug must exist in Ad Apply Links)
- **`/apply/[slug]/thank-you`** — confirmation after submit (includes WhatsApp handoff text)
- **`/ad-leads`** — trial leads from apply forms
- **`/review-trials`** — trial check-in, renewal, and follow-up work queue

This is **not** the Review Assistant `/r` customer review collection flow. Do not mix ad/trial leads with cold outreach queues without checking lead type.

---

## Data model summary

| Model | Role |
|-------|------|
| **Lead** | Core record: contact, outreach status, messages, replies, trial/review fields |
| **Campaign** | Groups leads by source keyword / area / name |
| **ImportBatch** | One Excel import run and its counts |
| **MessageTemplate** | Outbound message bodies by industry/stage |
| **MessageTemplatePreset** | Named preset grouping for templates |
| **AdApplyLink** | Apply form slug and ad metadata |
| **ReviewPlanPeriod** | Review QR plan/trial period history on a lead |
| **ReplySopTemplate** | Reply Assistant SOP snippets (not outbound templates) |

Database: PostgreSQL (Neon in production). See [docs/deployment.md](docs/deployment.md).

---

## Development safety rules

- Do not change Prisma schema or database casually
- Do not change import or queue logic without sample tests (small Excel subset)
- Do not modify unrelated files in the same change
- Do not use `git add .` — stage only intended files
- Do not commit or push unless explicitly asked

---

## Required checks before commit

```powershell
npm run lint
.\node_modules\.bin\next.cmd build
npm run message:queue
npm run followup:queue
npm run build:cli
git diff --check
git status --short
```

---

## Deployment

See **[docs/deployment.md](docs/deployment.md)** for Neon + Vercel setup.

**Production expectations (needs verification):**

- Vercel deployment status: **Ready**
- Branch: **`main`**
- Latest commit on `main` should include `41fb15c` (import mapping) and related Lead Cleaner docs

**Smoke-check routes after deploy:**

- `/queues`
- `/import`
- `/tools/lead-template-converter`
- `/review-qr-system`
- `/login` (if auth enabled)

---

## Further reading

- [docs/lead-cleaner.md](docs/lead-cleaner.md) — Lead Cleaner behavior and production test numbers
- [docs/deployment.md](docs/deployment.md) — Neon, Vercel, env vars, DB init

---

## Needs verification

The following are **not** confirmed from the repo alone. Check production / your environment before relying on them:

- **Production URL** — Vercel hostname not stored in code
- **`/apply/beauty-1`** — slug must exist in `AdApplyLink` in the production database (referenced from Review QR UI, not a hardcoded route file)
- **Production DB** — data volume, campaign names, and live lead counts
- **Auth in production** — whether `APP_PASSWORD` and `AUTH_COOKIE_SECRET` are set on Vercel
- **Local DB setup** — whether developers use Neon only or any legacy local SQLite (`deployment.md` mentions old `dev.db`; schema targets PostgreSQL)
- **Review QR image assets** — landing page may still use CSS fallbacks; see `public/images/review-qr/README.md`

---

## Tech stack (brief)

Next.js · React · TypeScript · Prisma · PostgreSQL · SheetJS (xlsx)
