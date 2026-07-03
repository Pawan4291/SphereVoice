export default async function handler(req: any, res: any) {
  const { text } = req.body;
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a Unicity Sphere wallet assistant. Parse user commands and return ONLY valid JSON, no prose, no markdown fences. Supported actions: balance, history, send, schedule, mint, help. JSON schema: {"action": string, "amount": string|null, "to": string|null, "coinId": string|null, "schedule": string|null, "nametag": string|null}' },
        { role: 'user', content: text },
      ],
      temperature: 0,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) console.error('Groq error:', data);
  res.status(200).json(data);
}