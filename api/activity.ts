import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const items = await redis.lrange('activity', 0, 49);
    return res.status(200).json(items.map((i: any) => typeof i === 'string' ? JSON.parse(i) : i));
  }
  if (req.method === 'POST') {
    const { type, amount, coinId, to, txId } = req.body ?? {};
    if (!type || !amount) return res.status(400).json({ error: 'Missing fields' });
    const id = crypto.randomUUID();
    await redis.lpush('activity', JSON.stringify({ id, type, amount, coinId, to, txId, timestamp: Date.now() }));
    await redis.ltrim('activity', 0, 199);
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
}