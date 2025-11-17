async function applyEdit(pgPool, analysis) {
    const { key, lang, newContent } = analysis;

    if (!key || !lang || !newContent) {
        throw new Error("Invalid analysis object. Missing key, lang, or newContent.");
    }

    const client = await pgPool.connect();

    try {
        const existingResult = await client.query(
            'SELECT body FROM text_snippets WHERE key = $1 AND lang = $2',
            [key, lang]
        );

        if (existingResult.rows.length > 0) {
            await client.query(
                'UPDATE text_snippets SET body = $1, updated_at = NOW() WHERE key = $2 AND lang = $3',
                [newContent, key, lang]
            );
            console.log('✅ Updated existing entry:', key, lang);
        } else {
            await client.query(
                'INSERT INTO text_snippets (key, lang, body, updated_at) VALUES ($1, $2, $3, NOW())',
                [key, lang, newContent]
            );
            console.log('✅ Inserted new entry:', key, lang);
        }
    } finally {
        client.release();
    }
}

async function fetchAllContent(pgPool) {
    const client = await pgPool.connect();

    try {
        const result = await client.query('SELECT key, lang, body FROM text_snippets');
        return result.rows;
    } finally {
        client.release();
    }
}

module.exports = { applyEdit, fetchAllContent };
