import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS state (
      id   TEXT PRIMARY KEY DEFAULT 'main',
      data JSONB NOT NULL DEFAULT '{"clients":[]}'
    )
  `;
  await sql`
    INSERT INTO state (id, data)
    VALUES ('main', '{"clients":[]}')
    ON CONFLICT (id) DO NOTHING
  `;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM state WHERE id = 'main'`;
      return res.status(200).json(rows[0]?.data || { clients: [] });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object')
        return res.status(400).json({ error: 'Invalid body' });
      await sql`
        UPDATE state SET data = ${JSON.stringify(body)}::jsonb
        WHERE id = 'main'
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
