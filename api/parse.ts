
export default async function handler(req: any, res: any) {
    
  const { text } = req.body;
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a Unicity Sphere wallet assistant. Parse user commands and return ONLY valid JSON, no prose. Supported actions: balance, history, send, schedule, mint, nametag, help. JSON schema: {"action": string, "amount": string|null, "to": string|null, "coinId": string|null, "schedule": string|null, "nametag": string|null}' },
        { role: 'user', content: text },
      ],
      temperature: 0,
    }),
  });
  const data = await resp.json();
  res.status(200).json(data);
}