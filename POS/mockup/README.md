# Hatcher Supply POS Mockup

This is a lightweight web mockup for viewing simulated Hatcher Supply POS data in PostgreSQL.

## What It Shows

- Dashboard totals
- Products and pricing
- Inventory balances and low-stock alerts
- Recent sales and tender types
- Customer records
- House accounts
- Loyalty balances
- Daily sales report

## Database

The app reads from PostgreSQL using `DATABASE_URL`.

Default local connection:

```text
postgres://postgres:postgres@127.0.0.1:55432/hatchers_pos_mock
```

## Local Setup

1. Start Docker Desktop.
2. Start the bundled local PostgreSQL database:

```powershell
npm run pos:db:up
```

3. Seed the mock database:

```powershell
npm run pos:seed
```

4. Start the mockup web app:

```powershell
npm run pos:dev
```

5. Open:

```text
http://localhost:4310
```

## Existing Postgres

If you already have a Postgres database, set `DATABASE_URL` before seeding or running:

```powershell
$env:DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE"
npm run pos:seed
npm run pos:dev
```

## Quick Command Reference

From the repository root:

```powershell
npm run pos:db:up
npm run pos:seed
npm run pos:dev
```

If the database is already running elsewhere:

```powershell
$env:DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE"
npm run pos:seed
npm run pos:dev
```

## Notes

The app defaults to:

```text
postgres://postgres:postgres@127.0.0.1:55432/hatchers_pos_mock
```

The Docker container uses PostgreSQL's normal internal port `5432`, but exposes it to Windows on `55432` to avoid conflicts with any existing local PostgreSQL service.

## Railway

On Railway, set `DATABASE_URL` to the PostgreSQL connection string, then run the seed script once before starting the app.
