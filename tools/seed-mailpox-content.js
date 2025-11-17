const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cheerio = require('cheerio');
require('dotenv').config();

async function seedMailpoxContent() {
    const filePath = path.join(__dirname, '..', 'src', 'content', 'pages', 'mailpox.en.html');
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(htmlContent);
    const snippets = [];

    $('[data-key]').each((i, el) => {
        const key = $(el).attr('data-key');
        const body = $(el).html();
        snippets.push({ key, lang: 'en', body });
    });

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
    });

    const client = await pool.connect();

    try {
        for (const snippet of snippets) {
            const { key, lang, body } = snippet;
            const existingResult = await client.query(
                'SELECT key FROM text_snippets WHERE key = $1 AND lang = $2',
                [key, lang]
            );

            if (existingResult.rows.length > 0) {
                await client.query(
                    'UPDATE text_snippets SET body = $1, updated_at = NOW() WHERE key = $2 AND lang = $3',
                    [body, key, lang]
                );
                console.log(`✅ Updated: ${key}`);
            } else {
                await client.query(
                    'INSERT INTO text_snippets (key, lang, body, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                    [key, lang, body]
                );
                console.log(`✅ Inserted: ${key}`);
            }
        }
    } finally {
        await client.release();
        await pool.end();
    }
}

seedMailpoxContent().catch(console.error);
