#!/usr/bin/env node
require("dotenv").config();
const { Pool } = require("pg");
const cheerio = require("cheerio");

const demoPage = require("../src/content/pages/demo.js");
const html = demoPage?.locales?.en?.mainContent || "";
if (!html.trim()) {
  console.error("Unable to load demo page HTML from src/content/pages/demo.js");
  process.exit(1);
}

const $ = cheerio.load(html);
const entries = new Map();
$("[data-key]").each((_, el) => {
  const key = $(el).attr("data-key");
  if (!key) return;
  const raw = $(el)
    .text()
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  if (!raw) return;
  if (!entries.has(key)) {
    entries.set(key, raw);
  }
});

if (entries.size === 0) {
  console.error("No data-key entries found in demo page HTML");
  process.exit(1);
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false,
});

(async function seed() {
  const client = await pool.connect();
  try {
    for (const [key, body] of entries.entries()) {
      await client.query(
        `
        INSERT INTO text_snippets (key, lang, body, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (key, lang)
        DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()
      `,
        [key, "en", body],
      );
      console.log(`Upserted demo key: ${key}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
  console.log(`Seeded ${entries.size} demo keys into text_snippets`);
})().catch((err) => {
  console.error("Failed to seed demo texts:", err);
  process.exit(1);
});
