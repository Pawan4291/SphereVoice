import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { to, amount, coinId, rule, funder } = req.body;
    const id = crypto.randomUUID();
    const record = { id, to, amount, coinId: coinId ?? 'UCT', rule, funder, status: 'pending', cyclesDone: 0, refunded: false, createdAt: Date.now() };
    await redis.hset('schedules', { [id]: JSON.stringify(record) });
    return res.status(200).json(record);
  }
  if (req.method === 'GET') {
    const all = (await redis.hgetall('schedules')) as Record<string, string> | null;
    const list = all ? Object.values(all).map((v: any) => typeof v === 'string' ? JSON.parse(v) : v) : [];
    return res.status(200).json(list);
  }
  if (req.method === 'PATCH') {
    const { id, status } = req.body;
    const raw = await redis.hget('schedules', id);
    const s: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!s) return res.status(404).json({ error: 'not found' });
    s.status = status;
    await redis.hset('schedules', { [id]: JSON.stringify(s) });
    return res.status(200).json(s);
  }
  res.status(405).end();
}