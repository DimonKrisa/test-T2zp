const { neon } = require('@neondatabase/serverless');
const { authenticateTelegram } = require('./_telegram');

const sql = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL не настроен в Vercel');
  return neon(process.env.DATABASE_URL);
};

const DEFAULT_DATA = {
  plans: { sim: 100, mnp: 0, gsm: 200000, acc: 0, shpd: 30, rtk: 50000, subs: 15000 },
  salarySettings: { basePay: 25000, daysWorked: 15, daysTotal: 30 },
  simSalesLog: [],
  mnpList: [],
  shpdList: [],
  salesLog: { gsm: [], acc: [], subs: [], rtk: [] },
  dailyMatrix: { sim: {}, gsm: {}, acc: {}, shpd: {}, rtk: {}, subs: {} },
  notes: '',
  notesList: []
};

async function ensureTable(db) {
  await db`
    CREATE TABLE IF NOT EXISTS telegram_users (
      telegram_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

module.exports = async function handler(req, res) {
  try {
    const user = authenticateTelegram(req);
    const db = sql();
    await ensureTable(db);
    const telegramId = String(user.id);

    if (req.method === 'GET') {
      const rows = await db`
        SELECT data FROM telegram_users WHERE telegram_id = ${telegramId} LIMIT 1
      `;
      if (!rows.length) {
        return res.status(200).json({ data: DEFAULT_DATA, isNew: true });
      }
      return res.status(200).json({ data: rows[0].data, isNew: false });
    }

    if (req.method === 'POST') {
      const data = req.body?.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ error: 'Некорректные данные приложения' });
      }

      await db`
        INSERT INTO telegram_users (telegram_id, data, updated_at)
        VALUES (${telegramId}, ${JSON.stringify(data)}::jsonb, NOW())
        ON CONFLICT (telegram_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: e.message || 'Ошибка авторизации' });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '8mb' } }
};
