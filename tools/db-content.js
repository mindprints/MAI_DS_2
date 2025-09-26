// db-content.js
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASS,
  database: 'MAI__texts', ssl: false
});

async function getText(key, lang='en') {
  const { rows } = await pool.query(`
    WITH pref AS (SELECT body FROM text_snippets WHERE key=$1 AND lang=$2),
         def  AS (SELECT body FROM text_snippets WHERE key=$1 AND lang='en')
    SELECT COALESCE((SELECT body FROM pref),(SELECT body FROM def)) AS body
  `, [key, lang]);
  return rows[0]?.body ?? '';
}

async function getImageUrl(key, variant=null) {
  const { rows } = await pool.query(`
    SELECT m.storage_url
    FROM media_assets m
    WHERE m.key=$1
    LIMIT 1
  `, [key]);
  return rows[0]?.storage_url || '';
}

module.exports = { getText, getImageUrl };
const USE_DB = process.env.USE_DB_CONTENT === 'true';

// before: const title = 'In The Minds of Machines';
const title = USE_DB ? await getText('page.home.seg.1', lang) : 'In The Minds of Machines';

// before: <img src="/images/hero.webp">
const heroUrl = USE_DB ? await getImageUrl('img.ai-coding') : '/images/hero.webp';
