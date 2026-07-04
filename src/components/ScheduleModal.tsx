import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const ASTRID_ADDRESS = import.meta.env.VITE_ASTRID_ADDRESS as string;
const UNIT_MS: Record<string, number> = {
  minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000,
};

function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  initial: { to: string; amount: string; coinId: string };
  onClose: () => void;
  onScheduled: (details: any) => void;
}

export default function ScheduleModal({ initial, onClose, onScheduled }: Props) {
  const { sendPayment, assets, nametag, directAddress } = useWallet();
  const [mode, setMode] = useState<'once' | 'recurring'>('once');
  const [to, setTo] = useState(initial.to);
  const [amount, setAmount] = useState(initial.amount);
  const [coinId, setCoinId] = useState(initial.coinId || 'UCT');

  const [runAt, setRunAt] = useState(toLocalInputValue(Date.now() + 3600000));

  const [intervalNum, setIntervalNum] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days');
  const [endAt, setEndAt] = useState(toLocalInputValue(Date.now() + 30 * 86400000));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  

  const startMs = Date.now();
  const intervalMs = intervalNum * UNIT_MS[intervalUnit];
  const endMs = new Date(endAt).getTime();
  const runMs = new Date(runAt).getTime();

  const totalCycles = mode === 'recurring' && intervalMs > 0
    ? Math.max(1, Math.floor((endMs - startMs) / intervalMs) + 1)
    : 1;
  const invalidRecurring = mode === 'recurring' && (endMs <= startMs || intervalMs <= 0);
  const invalidOnce = mode === 'once' && runMs <= Date.now();

  const coinOptions = assets.length > 0 ? assets.map((a: any) => a.symbol ?? a.coinId) : ['UCT', 'BTC', 'ETH', 'SOL'];

  const confirm = async () => {
    if (!to || !amount || invalidRecurring || invalidOnce) {
      setError(mode === 'recurring' ? '"Repeat until" must be after now' : 'Pick a valid future date/time');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const asset = assets.find((a: any) => a.symbol?.toUpperCase() === coinId.toUpperCase());
      const decimals = asset?.decimals ?? 18;
      const perCycleBase = Math.round(parseFloat(amount) * (10 ** decimals)).toString();
      const totalBase = (BigInt(perCycleBase) * BigInt(totalCycles)).toString();

      await sendPayment(ASTRID_ADDRESS, totalBase, coinId);

      const rule = mode === 'once'
        ? { type: 'once', due_at: runMs, totalCycles: 1 }
        : { type: 'recurring', startAt: startMs, intervalMs, totalCycles };

      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to, amount: perCycleBase, coinId, funder: nametag ? `@${nametag}` : directAddress,
          rule,
        }),
      });

      onScheduled({
        amount, coinId, to, totalCycles,
        intervalLabel: mode === 'once' ? new Date(runMs).toLocaleString() : `${intervalNum} ${intervalUnit}`,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-orange-500/20 rounded-2xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Schedule Payment</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setMode('once')}
            className={`flex-1 py-2 rounded-lg text-sm ${mode === 'once' ? 'bg-orange-500 text-white' : 'bg-black/40 border border-orange-500/20 text-gray-400'}`}>
            One-time
          </button>
          <button onClick={() => setMode('recurring')}
            className={`flex-1 py-2 rounded-lg text-sm ${mode === 'recurring' ? 'bg-orange-500 text-white' : 'bg-black/40 border border-orange-500/20 text-gray-400'}`}>
            Recurring
          </button>
        </div>

        <div>
          <label className="text-gray-500 text-xs">Sending to</label>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="@alice"
            className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm mt-1" />
        </div>

        <div>
          <label className="text-gray-500 text-xs">Amount per transfer</label>
          <div className="flex gap-2 mt-1">
            <input value={amount} onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm" />
            <select value={coinId} onChange={e => setCoinId(e.target.value)}
              className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-400 text-sm">
              {coinOptions.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {mode === 'once' ? (
          <div>
            <label className="text-gray-500 text-xs">Send at</label>
            <input
              type="datetime-local"
              value={runAt}
              onChange={e => setRunAt(e.target.value)}
              className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm mt-1 [color-scheme:dark]"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="text-gray-500 text-xs">Repeat every</label>
              <div className="flex gap-2 mt-1">
                <input type="number" min={1} value={intervalNum} onChange={e => setIntervalNum(Number(e.target.value))}
                  className="w-20 bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm" />
                <div className="flex flex-wrap gap-1 flex-1">
                  {(['minutes', 'hours', 'days', 'weeks', 'months'] as const).map(u => (
                    <button key={u} onClick={() => setIntervalUnit(u)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs capitalize ${intervalUnit === u ? 'bg-orange-500 text-white' : 'bg-black/40 border border-orange-500/20 text-gray-400'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-gray-500 text-xs">Repeat until</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={e => setEndAt(e.target.value)}
                className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm mt-1 [color-scheme:dark]"
              />
            </div>
          </>
        )}

        <div className="bg-orange-500/10 rounded-lg p-3 text-xs text-gray-300 space-y-1">
          <div>Total cycles: <b>{totalCycles}</b></div>
          <div>Total deposit needed: <b>{(parseFloat(amount || '0') * totalCycles).toFixed(6)} {coinId}</b></div>
          {invalidRecurring && <div className="text-red-400">⚠ "Repeat until" must be after now</div>}
          {invalidOnce && <div className="text-red-400">⚠ Pick a future date/time</div>}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-lg text-gray-400 text-sm">Cancel</button>
          <button onClick={confirm} disabled={loading || invalidRecurring || invalidOnce} className="flex-1 py-2 bg-orange-500 rounded-lg text-white text-sm disabled:opacity-50">
            {loading ? 'Depositing…' : 'Deposit & Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}