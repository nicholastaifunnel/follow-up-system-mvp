# Neon and Vercel Deployment

This app uses Prisma with Neon PostgreSQL for production. The existing local SQLite `prisma/dev.db` is not automatically migrated to Neon.

## 1. Create Neon Project

Create a Neon project named `follow-up-system-mvp` and wait for the PostgreSQL database to become available.

## 2. Copy Connection Strings

In Neon, copy the pooled/app connection string and the direct connection string. If Neon provides two different strings, keep both values separate.

Set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require&channel_binding=require"
```

Use `DATABASE_URL` for the app and Vercel runtime. Use `DIRECT_URL` when running Prisma `db push` or migrations.

## 3. Configure Vercel

In Vercel Project -> Settings -> Environment Variables, add:

- `DATABASE_URL` = Neon pooled/app connection string
- `DIRECT_URL` = Neon direct connection string

Use the same values in your local `.env` when running Prisma setup commands from your machine. Do not commit real `.env` values.

## 4. Initialize an Empty Neon Database

From a trusted machine or CI environment with the correct environment variables:

```powershell
npm run db:generate
npm run db:push
npm run seed:templates
npm run import:leads -- "C:\path\to\your.xlsx"
```

For a long-lived production database, prefer a repeatable Prisma migration workflow. For this MVP, `db push` is acceptable for initializing a new empty Neon database when you are not preserving existing production data.

## 5. Deploy and Verify

Deploy to Vercel, then check:

- `/`
- `/queues`
- `/import`
- `/leads/[id]`

## Notes

- SQLite `prisma/dev.db` data will not automatically move to Neon.
- If you need old local data in Neon, perform a separate data migration.
- The current recommendation is to re-import leads into Neon from Excel.
- Never commit `.env`, `.db`, `.xlsx`, `node_modules`, `dist`, or `.next`.
- This deployment does not add auth, WhatsApp API, webhooks, or AI.
