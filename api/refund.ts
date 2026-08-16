import { createClient } from '@supabase/supabase-js';
import { getAstridWallet, resolveCoinId } from './_astrid.js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export default async function handler(req: any, res: any) {
  const { id } = req.body ?? {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const { data: s } = await supabase.from('schedules').select('*').eq('id', id).single();
  if (!s || s.refunded) return res.status(400).json({ error: 'invalid or already refunded' });
  const remainingCycles = (s.rule.totalCycles ?? 1) - (s.cyclesDone ?? 0);
  if (remainingCycles <= 0) return res.status(400).json({ error: 'nothing left to refund' });
  const remaining = (BigInt(remainingCycles) * BigInt(s.amount)).toString();
  let result;
  try {
    const sphere = await getAstridWallet();
    result = await sphere.payments.send({ recipient: s.funder, amount: remaining, coinId: resolveCoinId(s.coinId) });
  } catch (err: any) {
    console.error('Refund send failed:', err);
    return res.status(500).json({ error: err?.message ?? 'send failed', code: err?.code });
  }
  s.refunded = true;
  s.status = 'cancelled';
  s.refundedAt = Date.now();
s.refundAmount = remaining;
s.refundTxId = result.transferId ?? result.id;
  await supabase.from('schedules').update(s).eq('id', id);
  res.status(200).json({ status: result.status, refunded: remaining });
}