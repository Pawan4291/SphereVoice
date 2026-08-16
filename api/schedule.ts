import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { to, amount, coinId, rule, funder } = req.body;
    const id = crypto.randomUUID();
    const record = { id, to, amount, coinId: coinId ?? 'UCT', rule, funder, status: 'pending', cyclesDone: 0, refunded: false, createdAt: Date.now() };
    await supabase.from('schedules').insert(record);
    return res.status(200).json(record);
  }
  if (req.method === 'GET') {
    const { data } = await supabase.from('schedules').select('*');
    return res.status(200).json(data ?? []);
  }
  if (req.method === 'PATCH') {
    const { id, status } = req.body;
    const { data: s } = await supabase.from('schedules').select('*').eq('id', id).single();
    if (!s) return res.status(404).json({ error: 'not found' });
    await supabase.from('schedules').update({ status }).eq('id', id);
    return res.status(200).json({ ...s, status });
  }
  res.status(405).end();
}