import { Redis } from '@upstash/redis';
import { getAstridWallet } from './_astrid.js';

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

function isDueNow(rule: any, cyclesDone: number, lastRun?: number) {
  if (rule.type === 'recurring') {
    if ((cyclesDone ?? 0) >= rule.totalCycles) return false;
    if (!lastRun) return true;
    return Date.now() - lastRun >= rule.intervalMs;
  }
  if (rule.type === 'once') return rule.due_at <= Date.now();
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  const all = (await redis.hgetall('schedules')) as Record<string, string> | null;
  const schedules = all ? Object.entries(all).map(([id, v]: [string, any]) => ({ id, ...(typeof v === 'string' ? JSON.parse(v) : v) })) : [];
  console.log('CRON RUN: found', schedules.length, 'schedules', JSON.stringify(schedules));

  const sphere = await getAstridWallet();
  const results = [];

  for (const s of schedules) {
    if (s.status !== 'pending') continue;
    if (!isDueNow(s.rule, s.cyclesDone ?? 0, s.lastRun)) continue;
    try {
      const result = await sphere.payments.send({ recipient: s.to, amount: s.amount, coinId: s.coinId });
      s.cyclesDone = (s.cyclesDone ?? 0) + 1;
      s.lastRun = Date.now();
      s.lastResult = result.status;
      if (s.rule.type === 'once' || s.cyclesDone >= s.rule.totalCycles) s.status = 'executed';
      results.push({ id: s.id, status: 'sent', cyclesDone: s.cyclesDone });
    } catch (e: any) {
      s.lastError = e?.message ?? 'unknown error';
      results.push({ id: s.id, status: 'failed', error: s.lastError });
    }
    await redis.hset('schedules', { [s.id]: JSON.stringify(s) });
  }
  return res.status(200).json({ checked: schedules.length, results });
}