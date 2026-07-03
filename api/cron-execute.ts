import { Redis } from '@upstash/redis';
import { getAstridWallet } from './_astrid.js';

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

function isDueNow(rule: any, lastRun?: number) {
  const now = new Date();
  if (rule.type === 'once') return rule.due_at <= Date.now();
  if (rule.type === 'recurring') {
    if (rule.until && Date.now() > rule.until) return false;
    if (!rule.daysOfWeek.includes(now.getDay())) return false;
    const [h, m] = rule.time.split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return false;
    if (lastRun && new Date(lastRun).toDateString() === now.toDateString()) return false;
    return true;
  }
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  const all = (await redis.hgetall('schedules')) as Record<string, string> | null;
  const schedules = all ? Object.entries(all).map(([id, v]: [string, any]) => ({ id, ...(typeof v === 'string' ? JSON.parse(v) : v) })) : [];
  const sphere = await getAstridWallet();
  const results = [];

  for (const s of schedules) {
    if (s.status === 'cancelled' || !isDueNow(s.rule, s.lastRun)) continue;
    try {
      const result = await sphere.payments.send({ recipient: s.to, amount: s.amount, coinId: s.coinId });
      s.lastRun = Date.now();
      s.status = s.rule.type === 'once' ? 'executed' : 'pending';
      s.lastResult = result.status;
      results.push({ id: s.id, status: 'sent' });
    } catch (e: any) {
      s.status = s.rule.type === 'once' ? 'failed' : 'pending';
      s.lastError = e?.message ?? 'unknown error';
      results.push({ id: s.id, status: 'failed', error: s.lastError });
    }
    await redis.hset('schedules', { [s.id]: JSON.stringify(s) });
  }
  return res.status(200).json({ checked: schedules.length, results });
}