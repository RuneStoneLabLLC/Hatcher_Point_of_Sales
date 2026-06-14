import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "..", "sql", "seed.sql");
const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:55432/hatchers_pos_mock";

const client = new Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

try {
  const sql = await readFile(sqlPath, "utf8");
  await client.connect();
  await client.query(sql);
  console.log("Seeded Hatcher POS mock database.");
} finally {
  await client.end();
}
