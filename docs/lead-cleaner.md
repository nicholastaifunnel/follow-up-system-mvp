# Lead Cleaner & Template Converter

## Status

- **Stable / production verified** (2026-05-22)
- **Route:** `/tools/lead-template-converter`
- **Commit:** `bbad02b` — Switch lead cleaner to exclude-only mode
- **Related commit:** `2891fbc` — Clear lead cleaner preview when settings change

## Current behavior

- **Exclude-only mode** — operators tune exclusion; there is no Keep Keywords UI.
- **Keep Keywords UI removed** (superseded by exclude-only workflow).
- **Exclude Keywords** editable in Batch Settings.
- **Use Beauty/Spa Exclude Keywords** preset button fills common exclude lines.
- **Changing settings** (exclude or other batch fields) **clears** the previous Cleaning Summary and Preview until **Clean & Preview** is run again.
- **Client-side CSV only** — parsing, filtering, and export run in the browser; **no database writes**.
- **Output** remains the **20-column** standard Follow-up System lead template.
- **Downloads** unchanged: **Keep Only** and **All Cleaned**, each as **CSV** and **Excel** (phone/CID text formatting preserved).

## Classification rules

After duplicate detection, each row is classified in order:

1. **Duplicate** — same-upload duplicate (phone, place_id, etc.); first row keeps normal classification.
2. **Exclude keyword match** (business name, category, address, website, social link, notes) → `Exclude - Irrelevant` with reason `Exclude - matched exclude keyword: …`
3. **No phone, website, or social link** → `Exclude - No Contact Info`
4. **WhatsApp-ready mobile** → `Keep - Queue Ready`
5. **No WhatsApp-ready mobile, but has website or social** → `Keep - No Phone but Has Web/Social`
6. **Landline / normal phone only** (no WhatsApp-ready mobile) → `Review` (`Review - landline only, no WhatsApp-ready mobile`)

Exclude keywords are evaluated before contact-based Keep/Review paths. Rows with contact that are not excluded and have WhatsApp or web/social follow the Keep rules above.

## Production verification

Test file: `gosom-ear-cleaning-johor-bahru-raw.csv` (53 rows). Verified on production `/tools/lead-template-converter`.

### Cleaning Summary

| Metric | Count |
|--------|------:|
| Total Rows | 53 |
| Keep - Queue Ready | 26 |
| Keep - No Phone but Has Web/Social | 2 |
| Review | 1 |
| Exclude - Irrelevant | 22 |
| Exclude - No Contact Info | 0 |
| Duplicates | 2 |

### Preview tabs

| Tab | Count |
|-----|------:|
| All | 53 |
| Keep | 28 |
| Review | 1 |
| Exclude / Duplicate | 24 |

### Checks

- **Keep Only** CSV and Excel downloads: **non-empty**
- Sample irrelevant merchants (**ENT**, **clinic**, **hearing**, **Guardian**) did **not** enter **Keep**

## Out of scope

This tool does **not**:

- Change **Prisma** or the **database**
- Run the **import DB** flow (`/import`)
- Modify **queues** (`/queues`) or queue scripts
- Send **WhatsApp** messages
- Change the **Review QR** landing page or related flows

## Related commits

| Commit | Summary |
|--------|---------|
| `cea321b` | Excel text formatting for phone/CID columns |
| `bbaabb2` | Filter phase 1a — 20 columns, tabs, dedupe, summary |
| `6266cb6` | Keep-keyword gating in classifier (later superseded by exclude-only UI) |
| `2891fbc` | Clear preview when settings change |
| `bbad02b` | Exclude-only mode — remove Keep Keywords UI |
