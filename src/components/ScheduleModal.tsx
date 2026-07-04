import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const ASTRID_ADDRESS = import.meta.env.VITE_ASTRID_ADDRESS as string;
const UNIT_MS: Record<string, number> = {
  minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000,
};

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

 const nowPlus10m = new Date(Date.now() + 600000);
  const [runDate, setRunDate] = useState(nowPlus10m.toISOString().slice(0, 10));
  const [runTime, setRunTime] = useState(nowPlus10m.toTimeString().slice(0, 5));
  const [startDate, setStartDate] = useState(nowPlus10m.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(nowPlus10m.toTimeString().slice(0, 5));

  const [intervalNum, setIntervalNum] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days');

  const [endDate, setEndDate] = useState(nowPlus10m.toISOString().slice(0, 10));
  const [endTime, setEndTime] = useState('23:59');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startMs = new Date(`${startDate}T${startTime}`).getTime();
  const intervalMs = intervalNum * UNIT_MS[intervalUnit];
  const endMs = new Date(`${endDate}T${endTime}`).getTime();
  const runMs = new Date(`${runDate}T${runTime}`).getTime();
useEffect(() => { setError(''); }, [to, amount, coinId, runDate, runTime, startDate, startTime, intervalNum, intervalUnit, endDate, endTime, mode]);

 const totalCycles = mode === 'recurring' && intervalMs > 0
    ? Math.max(1, Math.floor((endMs - startMs) / intervalMs) + 1)
    : 1;
const MIN_INTERVAL_MS = 300000; // 5 minutes, matches cron-job.org's 60s polling reliability floor
 const invalidRecurring = mode === 'recurring' && (endMs <= startMs || intervalMs <= 0 || startMs < Date.now() + 600000 || intervalMs < MIN_INTERVAL_MS);
  const invalidOnce = mode === 'once' && runMs < Date.now() + 600000;

  const coinOptions = assets.length > 0 ? assets.map((a: any) => a.symbol ?? a.coinId) : ['UCT', 'BTC', 'ETH', 'SOL'];

  const confirm = async () => {
    console.log('DEBUG runMs:', runMs, 'now:', Date.now(), 'diff:', runMs - Date.now(), 'invalidOnce:', invalidOnce, 'runDate:', runDate, 'runTime:', runTime);
    if (!to) { setError('Enter a recipient (e.g. @alice)'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (invalidRecurring) { setError('"Repeat until" must be after now'); return; }
    if (invalidOnce) { setError('Pick a valid future date/time'); return; }
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
            <button
              onClick={() => {
                const asset = assets.find((a: any) => a.symbol?.toUpperCase() === coinId.toUpperCase());
                if (asset) {
                  const decimals = asset.decimals ?? 18;
                  const human = Number(BigInt(asset.totalAmount ?? '0')) / (10 ** decimals);
                  setAmount(human.toString());
                }
              }}
              className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-xs whitespace-nowrap"
            >
              Max
            </button>
            <select value={coinId} onChange={e => setCoinId(e.target.value)}
              className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-400 text-sm">
              {coinOptions.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Available: {(() => {
              const asset = assets.find((a: any) => a.symbol?.toUpperCase() === coinId.toUpperCase());
              if (!asset) return '0';
              const decimals = asset.decimals ?? 18;
              return (Number(BigInt(asset.totalAmount ?? '0')) / (10 ** decimals)).toString();
            })()} {coinId}
          </p>
        </div>

        {mode === 'once' ? (
          <div>
            <label className="text-gray-500 text-xs">Send at</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input type="date" value={runDate} onChange={e => setRunDate(e.target.value)}
                className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
              <input type="time" value={runTime} onChange={e => setRunTime(e.target.value)}
                className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
            </div>
            <p className="text-xs text-gray-600 mt-1">ⓘ Payment may take 2-3 minutes to reach the destination wallet after this time</p>
          </div>
        ) : (
          <>
           <div>
              <label className="text-gray-500 text-xs">Start time (at the start time first payment will go)</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
              </div>
              <p className="text-xs text-gray-600 mt-1">ⓘ Payment may take 2-3 minutes to reach the destination wallet after this time</p>
            </div>

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
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  max={new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().slice(0, 10)}
                  className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
              </div>
            </div>
          </>
        )}

        <div className="bg-orange-500/10 rounded-lg p-3 text-xs text-gray-300 space-y-1">
          <div>Total cycles: <b>{totalCycles}</b></div>
          <div>Total deposit needed: <b>{(parseFloat(amount || '0') * totalCycles).toFixed(6)} {coinId}</b></div>
          {mode === 'recurring' && intervalMs > 0 && intervalMs < 300000 && <div className="text-red-400">⚠ Minimum interval is 5 minutes for reliable execution</div>}
{invalidRecurring && intervalMs >= 300000 && <div className="text-red-400">⚠ Start time must be at least 10 minutes from now, and "Repeat until" must be after start</div>}
          {invalidOnce && <div className="text-red-400">⚠ Pick a time at least 10 minutes from now</div>}
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