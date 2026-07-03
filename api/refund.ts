import { Redis } from '@upstash/redis';
import { getAstridWallet } from './_astrid.js';
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

export default async function handler(req: any, res: any) {
  const { id } = req.body;
  const raw = await redis.hget('schedules', id);
  const s: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!s || s.refunded) return res.status(400).json({ error: 'invalid or already refunded' });
  const remainingCycles = (s.rule.totalCycles ?? 1) - (s.cyclesDone ?? 0);
  if (remainingCycles <= 0) return res.status(400).json({ error: 'nothing left to refund' });
  const remaining = (BigInt(remainingCycles) * BigInt(s.amount)).toString();
  let result;
  try {
    const sphere = await getAstridWallet();
    result = await sphere.payments.send({ recipient: s.funder, amount: remaining, coinId: s.coinId });
  } catch (err: any) {
    console.error('Refund send failed:', err);
    return res.status(500).json({ error: err?.message ?? 'send failed', code: err?.code });
  }
  s.refunded = true;
  s.status = 'cancelled';
  await redis.hset('schedules', { [id]: JSON.stringify(s) });
  res.status(200).json({ status: result.status, refunded: remaining });
}