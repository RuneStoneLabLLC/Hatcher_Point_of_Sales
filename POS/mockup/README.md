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

Run commands from the project root:

```powershell
cd "C:\Users\danie\Desktop\RuneStoneLabs LLC\RSL-HatchersSupply\Hatcher_Point_of_Sales"
```

1. Start Docker Desktop.
2. Start the bundled local PostgreSQL database:

```powershell
npm run pos:db:up
```

3. Seed the mock database:

```powershell
npm run pos:seed
```

## Start Website and POS Together

Use this when you want to view the public website and access the POS from `/pos/` on the same local server. This is also the setup Railway uses.

```powershell
npm start
```

Open the public website:

```text
http://localhost:4321/
```

Open the admin POS:

```text
http://localhost:4321/pos/
```

If port `4321` is already being used, choose another port:

```powershell
$env:PORT="4322"
npm start
```

Then open:

```text
http://localhost:4322/
http://localhost:4322/pos/
```

## Start POS Only

Use this when you only want the POS mockup server:

```powershell
npm run pos:dev
```

Open:

```text
http://localhost:4310/
```

Admin login:

```text
Username: admin
Password: HatcherStore%^&0
```

## Existing Postgres

If you already have a Postgres database, set `DATABASE_URL` before seeding or running:

```powershell
$env:DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE"
npm run pos:seed
npm run pos:dev
```

## Quick Command Reference

From the `Hatcher_Point_of_Sales` project root:

```powershell
npm run pos:db:up
npm run pos:seed
npm start
```

Standalone POS only:

```powershell
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

The root project start command serves both the public website and the admin POS:

```text
npm start
```

Public website:

```text
/
```

Admin POS:

```text
/pos/
```

Set these Railway variables:

```text
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE
POS_ADMIN_USERNAME=admin
POS_ADMIN_PASSWORD=HatcherStore%^&0
NODE_ENV=production
```

Run the seed script once against the Railway PostgreSQL database before using the POS:

```text
npm run pos:seed
```
