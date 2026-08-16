import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const { data } = await supabase.from('activity').select('*').order('timestamp', { ascending: false }).limit(50);
    return res.status(200).json(data ?? []);
  }
  if (req.method === 'POST') {
    const { type, amount, coinId, to, txId } = req.body ?? {};
    if (!type || !amount) return res.status(400).json({ error: 'Missing fields' });
    const id = crypto.randomUUID();
    await supabase.from('activity').insert({ id, type, amount, coinId, to, txId, timestamp: Date.now() });
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
}