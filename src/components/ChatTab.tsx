import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'pending' | 'success' | 'error';
  data?: any;
}

function formatAmount(amount: string, symbol: string = 'UCT', decimals: number = 18): string {
  const n = BigInt(amount);
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return `${whole} ${symbol}`;
  return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')} ${symbol}`;
}

function toBaseUnits(amount: string, decimals: number): bigint {
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * (10n ** BigInt(decimals)) + BigInt(fracPadded || '0');
}

async function parseWithDeepSeek(text: string): Promise<any> {
  const resp = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) return localParse(text);
  const json = await resp.json();
  const raw = json.choices?.[0]?.message?.content ?? '{}';
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    return JSON.parse(cleaned.trim());
  } catch {
    return localParse(text);
  }
}

function localParse(text: string): any {
  const lower = text.toLowerCase().trim();

  if (lower.includes('balance') || lower.includes('how much')) return { action: 'balance' };
  if (lower.includes('history') || lower.includes('transactions') || lower.includes('past')) return { action: 'history' };
  if (lower.includes('help') || lower.includes('what can')) return { action: 'help' };

  const mintMatch = lower.match(/mint\s+(\d+(?:\.\d+)?)\s*(\w+)?/);
  if (mintMatch) {
    return { action: 'mint', amount: mintMatch[1], coinId: mintMatch[2]?.toUpperCase() ?? 'UCT' };
  }

  const sendMatch = text.match(/send\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+to\s+(@?\S+)/i)
    || text.match(/(?:pay|transfer)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:to\s+)?(@?\S+)/i);
  if (sendMatch) {
    const amt = Math.round(parseFloat(sendMatch[1]) * 1_000_000).toString();
    const to = sendMatch[3].startsWith('@') ? sendMatch[3] : `@${sendMatch[3]}`;
    return { action: 'send', amount: amt, coinId: (sendMatch[2] ?? 'UCT').toUpperCase(), to };
  }

  const schedMatch = text.match(/schedule\s+(?:a\s+)?(?:payment\s+of\s+)?(\d+(?:\.\d+)?)\s*(\w+)?\s+to\s+(@?\S+)\s+(?:at|on|for)\s+(.+)/i);
  if (schedMatch) {
    const amt = Math.round(parseFloat(schedMatch[1]) * 1_000_000).toString();
    const to = schedMatch[3].startsWith('@') ? schedMatch[3] : `@${schedMatch[3]}`;
    const schedule = schedMatch[4].trim();
    return { action: 'schedule', amount: amt, coinId: (schedMatch[2] ?? 'UCT').toUpperCase(), to, schedule };
  }

  const nametagMatch = text.match(/(?:register|set|create)\s+(?:my\s+)?(?:nametag|name|id)\s+(?:as\s+|to\s+)?(@?\w+)/i);
  if (nametagMatch) {
    return { action: 'nametag', nametag: nametagMatch[1].replace('@', '') };
  }

  return { action: 'help' };
}

function parseScheduleDate(schedule: string): number {
  if (!schedule) return Date.now();
  const d = new Date(schedule);
  if (!isNaN(d.getTime())) return d.getTime();
  const relMatch = schedule.match(/in\s+(\d+)\s+(minute|hour|day)/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    if (unit.startsWith('minute')) return Date.now() + n * 60000;
    if (unit.startsWith('hour')) return Date.now() + n * 3600000;
    if (unit.startsWith('day')) return Date.now() + n * 86400000;
  }
  return Date.now() + 60000;
}

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function ChatTab() {
  const { status, assets, transfers, refreshBalance, refreshHistory, sendPayment, mintTokens, registerNametag, schedulePayment, nametag } = useWallet();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your SphereVoice assistant. You can talk to your Unicity wallet in plain English.\n\nTry: *\"What's my balance?\"*, *\"Send 5 UCT to @alice\"*, *\"Mint 1000 UCT\"*, or *\"Schedule 10 UCT to @bob in 5 minutes\"*.",
      timestamp: Date.now(),
      status: 'success',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

 const appendMsg = (msg: Omit<Message, 'id' | 'timestamp'>) => {
  const id = genId();
  setMessages(prev => [...prev, { ...msg, id, timestamp: Date.now() }]);
  return id;
};

const updateMsg = (id: string, patch: Partial<Message>) => {
  setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
};

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    appendMsg({ role: 'user', content: userText });
    setLoading(true);

    try {
      if (status !== 'connected') {
        appendMsg({ role: 'assistant', content: '⚠️ Please connect your wallet first (go to the **Settings** tab).', status: 'error' });
        setLoading(false);
        return;
      }

      const cmd = await parseWithDeepSeek(userText);
      let responseContent = '';
      let responseStatus: Message['status'] = 'success';
      
if (cmd.action === 'send' && cmd.schedule) cmd.action = 'schedule';
      switch (cmd.action) {
        case 'balance': {
          try {
            await refreshBalance();
            if (assets.length === 0) {
              responseContent = '📊 Your wallet is empty. Mint some test tokens first with: *"Mint 1000 UCT"*';
            } else {
              const lines = assets.map((a: any) => `**${a.symbol ?? a.coinId}**: ${formatAmount(a.totalAmount?.toString() ?? '0', a.symbol, a.decimals ?? 6)}`);
              responseContent = `📊 **Live Balance** (from testnet)\n\n${lines.join('\n')}`;
            }
          } catch (err: any) {
            responseContent = `❌ Balance fetch failed: ${err.message}`;
            responseStatus = 'error';
          }
          break;
        }

        case 'history': {
  try {
    const freshTransfers = await refreshHistory();
    if (freshTransfers.length === 0) {
      responseContent = '📜 No transactions found yet. Mint tokens or send a payment to see history.';
    } else {
      const lines = freshTransfers.slice(0, 5).map(t => {
        const hAsset = assets.find((a: any) => a.symbol === t.symbol || a.coinId === t.coinId);
        const hDecimals = hAsset?.decimals ?? 6;
        return `${t.type === 'sent' ? '↗️' : t.type === 'mint' ? '🏭' : '↙️'} **${t.type.toUpperCase()}** ${formatAmount(t.amount, t.symbol, hDecimals)} ${t.counterpart ? `→ ${t.counterpart}` : ''}`;
      });
      responseContent = `📜 **Transaction History** (last ${Math.min(5, freshTransfers.length)})\n\n${lines.join('\n')}`;
    }
  } catch (err: any) {
    responseContent = `❌ History fetch failed: ${err.message}`;
    responseStatus = 'error';
  }
  break;
}

       case 'send': {
          if (!cmd.to || !cmd.amount) {
            responseContent = '❌ Please specify both recipient and amount. Example: *"Send 5 UCT to @alice"*';
            responseStatus = 'error';
            break;
          }
          try {
           const sendAsset = assets.find((a: any) => a.symbol?.toUpperCase() === (cmd.coinId ?? 'UCT').toUpperCase() || a.coinId === (cmd.coinId ?? 'UCT'));
            const sendDecimals = sendAsset?.decimals ?? 6;
            const baseAmount = Math.round(parseFloat(cmd.amount) * (10 ** sendDecimals)).toString();
            const pendingId = appendMsg({ role: 'assistant', content: `🔄 Sending ${formatAmount(baseAmount, cmd.coinId ?? 'UCT', sendDecimals)} to **${cmd.to}**…`, status: 'pending' });
const result = await sendPayment(cmd.to, baseAmount, cmd.coinId ?? 'UCT');
updateMsg(pendingId, {
  content: `✅ **Payment Sent!**\nRecipient: ${cmd.to}\nAmount: ${formatAmount(baseAmount, cmd.coinId ?? 'UCT', sendDecimals)}\nStatus: ${result.status}${result.txId ? `\nTx: \`${result.txId.slice(0, 20)}…\`` : ''}`,
  status: 'success',
});
          } catch (err: any) {
  responseContent = `❌ Send failed: ${err.message}`;
  responseStatus = 'error';
}
          break;
        }

        case 'mint': {
          const coinId = cmd.coinId ?? 'UCT';
          const mintAsset = assets.find((a: any) => a.symbol?.toUpperCase() === coinId.toUpperCase() || a.coinId === coinId);
          const mintDecimals = mintAsset?.decimals ?? 18;
          const amt = toBaseUnits(cmd.amount ?? '1000', mintDecimals);
          try {
            const pendingId = appendMsg({ role: 'assistant', content: `🏭 Minting ${formatAmount(amt.toString(), coinId, mintDecimals)}…`, status: 'pending' });
const result = await mintTokens(coinId, amt);
if (result.success) {
  updateMsg(pendingId, { content: `✅ **Minted!** ${formatAmount(amt.toString(), coinId, mintDecimals)}\nToken ID: \`${result.tokenId?.slice(0, 20) ?? 'N/A'}…\``, status: 'success' });
} else {
  updateMsg(pendingId, { content: `❌ Mint failed: ${result.error}`, status: 'error' });
}
          } catch (err: any) {
            responseContent = `❌ Mint failed: ${err.message}`;
            responseStatus = 'error';
          }
          break;
        }

        case 'schedule': {
          if (!cmd.to || !cmd.amount) {
            responseContent = '❌ Specify recipient and amount. Example: *"Schedule 10 UCT to @bob in 5 minutes"*';
            responseStatus = 'error';
            break;
          }
          const due = parseScheduleDate(cmd.schedule ?? 'in 5 minutes');
          await schedulePayment(cmd.to, cmd.amount, cmd.coinId ?? 'UCT', due);
          const timeStr = new Date(due).toLocaleTimeString();
          responseContent = `🗓️ **Scheduled!**\nRecipient: ${cmd.to}\nAmount: ${formatAmount(cmd.amount, cmd.coinId ?? 'UCT')}\nScheduled for: **${timeStr}**\n\nAstrid will execute this automatically. Watch the *Watch Astrid Work* tab!`;
          break;
        }

        case 'nametag': {
          if (!cmd.nametag) {
            responseContent = '❌ Specify your desired nametag. Example: *"Register my nametag as alice"*';
            responseStatus = 'error';
            break;
          }
          const res = await registerNametag(cmd.nametag);
          if (res.success) {
            responseContent = `✅ Nametag **@${cmd.nametag}** registered! You can now receive payments at @${cmd.nametag}.`;
          } else {
            responseContent = `❌ Nametag registration failed: ${res.error}`;
            responseStatus = 'error';
          }
          break;
        }

        case 'help':
        default: {
          responseContent = `🤖 **SphereVoice Commands**\n\n• *"What's my balance?"*\n• *"Show my transaction history"*\n• *"Send 5 UCT to @alice"*\n• *"Mint 1000 UCT"*\n• *"Schedule 10 UCT to @bob in 5 minutes"*\n• *"Register my nametag as alice"*\n\nAll sends and mints are **real testnet transactions** via the Sphere SDK.${nametag ? `\n\nConnected as: **@${nametag}**` : ''}`;
          break;
        }
      }

      if (responseContent) {
        appendMsg({ role: 'assistant', content: responseContent, status: responseStatus });
      }
    } catch (err: any) {
      appendMsg({ role: 'assistant', content: `❌ Error: ${err.message}`, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-orange-300 font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-orange-200 italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-black/40 text-orange-400 px-1 rounded font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const suggestions = [
    "What's my balance?",
    "Mint 1000 UCT",
    "Show transaction history",
    "Schedule 5 UCT to @bob in 2 minutes",
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-orange-500/20 border border-orange-500/40'
                  : 'bg-black border border-orange-500/30'
              }`}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-orange-400" />
                  : <Bot className="w-4 h-4 text-orange-500" />}
              </div>

              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-orange-500/20 border border-orange-500/30 text-orange-100 rounded-tr-sm'
                    : msg.status === 'error'
                      ? 'bg-red-950/40 border border-red-500/30 text-red-200 rounded-tl-sm'
                      : msg.status === 'pending'
                        ? 'bg-black/60 border border-orange-500/20 text-gray-400 rounded-tl-sm'
                        : 'bg-black/60 border border-orange-500/20 text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.status === 'pending' && <Loader2 className="inline w-3 h-3 mr-1 animate-spin text-orange-500" />}
                  {msg.status === 'error' && <AlertCircle className="inline w-3 h-3 mr-1 text-red-400" />}
                  {msg.status === 'success' && msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <CheckCircle2 className="inline w-3 h-3 mr-1 text-green-400" />
                  )}
                  {renderContent(msg.content)}
                </div>
                <span className="text-xs text-gray-600 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-black border border-orange-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-orange-500" />
            </div>
            <div className="bg-black/60 border border-orange-500/20 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    className="w-2 h-2 bg-orange-500 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-300 hover:bg-orange-500/20 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-orange-500/10">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a command in plain English… (Enter to send)"
              className="w-full bg-black/40 border border-orange-500/20 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={loading}
            />
          </div>
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
          </motion.button>
        </div>
        <p className="text-xs text-gray-700 mt-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-orange-600" />
          Powered by AI → Sphere SDK → Unicity Testnet
        </p>
      </div>
    </div>
  );
}