import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const ASTRID_ADDRESS = import.meta.env.VITE_ASTRID_ADDRESS as string;

interface Props {
  initial: { to: string; amount: string; coinId: string; intervalMs: number; totalDurationMs: number };
  onClose: () => void;
  onScheduled: () => void;
}

export default function ScheduleModal({ initial, onClose, onScheduled }: Props) {
  const { sendPayment } = useWallet();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalCycles = Math.max(1, Math.floor(form.totalDurationMs / form.intervalMs));
  const totalAmount = (parseFloat(form.amount) * totalCycles).toString();

  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      const decimals = 18;
      const perCycleBase = Math.round(parseFloat(form.amount) * (10 ** decimals)).toString();
      const totalBase = (BigInt(perCycleBase) * BigInt(totalCycles)).toString();

      await sendPayment(ASTRID_ADDRESS, totalBase, form.coinId);

      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.to,
          amount: perCycleBase,
          coinId: form.coinId,
          funder: ASTRID_ADDRESS,
          rule: { type: 'recurring', intervalMs: form.intervalMs, totalCycles },
        }),
      });
      onScheduled();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-orange-500/20 rounded-2xl p-5 w-full max-w-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Schedule Payment</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="space-y-2 text-sm">
          <label className="text-gray-500 text-xs">Sending to</label>
          <input value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
            className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white" />
          <label className="text-gray-500 text-xs">Amount per transfer</label>
          <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white" />
          <label className="text-gray-500 text-xs">Every (ms)</label>
          <input type="number" value={form.intervalMs} onChange={e => setForm(f => ({ ...f, intervalMs: Number(e.target.value) }))}
            className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white" />
          <label className="text-gray-500 text-xs">For total duration (ms)</label>
          <input type="number" value={form.totalDurationMs} onChange={e => setForm(f => ({ ...f, totalDurationMs: Number(e.target.value) }))}
            className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-white" />
        </div>
        <div className="bg-orange-500/10 rounded-lg p-3 text-xs text-gray-300 space-y-1">
          <div>Total cycles: <b>{totalCycles}</b></div>
          <div>Total deposit needed: <b>{totalAmount} {form.coinId}</b></div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-lg text-gray-400 text-sm">Cancel</button>
          <button onClick={confirm} disabled={loading} className="flex-1 py-2 bg-orange-500 rounded-lg text-white text-sm disabled:opacity-50">
            {loading ? 'Depositing…' : 'Deposit & Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}