import { createClient } from '@supabase/supabase-js';
import { getAstridWallet, resolveCoinId } from './_astrid.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

function isDueNow(rule: any, cyclesDone: number, lastRun: number | undefined) {
  if (rule.type === 'recurring') {
    if ((cyclesDone ?? 0) >= rule.totalCycles) return false;
    if (lastRun) return Date.now() - lastRun >= rule.intervalMs;
    return Date.now() >= (rule.startAt ?? 0);
  }
  if (rule.type === 'once') return rule.due_at <= Date.now();
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  const { data: schedulesRaw } = await supabase.from('schedules').select('*');
const schedules = schedulesRaw ?? [];
  console.log('CRON RUN: found', schedules.length, 'schedules', JSON.stringify(schedules));

  const sphere = await getAstridWallet();
  const results = [];

  for (const s of schedules) {
    if (s.status !== 'pending') continue;
    const due = isDueNow(s.rule, s.cyclesDone ?? 0, s.lastRun);
    console.log('CHECK', s.id, 'status:', s.status, 'cyclesDone:', s.cyclesDone, 'lastRun:', s.lastRun, 'now:', Date.now(), 'diff:', s.lastRun ? Date.now() - s.lastRun : null, 'intervalMs:', s.rule?.intervalMs, 'due:', due);
    if (!due) continue;
    try {
      const result = await sphere.payments.send({ recipient: s.to, amount: s.amount, coinId: resolveCoinId(s.coinId) });
      s.cyclesDone = (s.cyclesDone ?? 0) + 1;
      s.lastRun = Date.now();
      s.lastResult = result.status;
      s.history = s.history ?? [];
s.history.push({ cycle: s.cyclesDone, timestamp: Date.now(), amount: s.amount, status: result.status, txId: result.transferId ?? result.id });
      if (s.rule.type === 'once' || s.cyclesDone >= s.rule.totalCycles) s.status = 'executed';
      results.push({ id: s.id, status: 'sent', cyclesDone: s.cyclesDone });
    } catch (e: any) {
      s.lastError = e?.message ?? 'unknown error';
      results.push({ id: s.id, status: 'failed', error: s.lastError });
    }
    await supabase.from('schedules').update(s).eq('id', s.id);
  }
  return res.status(200).json({ checked: schedules.length, results });
}