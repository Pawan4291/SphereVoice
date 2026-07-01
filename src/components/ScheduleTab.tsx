import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, Plus, Zap, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

function formatAmount(raw: string, symbol = 'UCT'): string {
  try {
    const n = BigInt(raw);
    const whole = n / 1_000_000n;
    const frac = n % 1_000_000n;
    if (frac === 0n) return `${whole.toLocaleString()} ${symbol}`;
    return `${whole.toLocaleString()}.${frac.toString().padStart(6, '0').replace(/0+$/, '')} ${symbol}`;
  } catch {
    return `${raw} ${symbol}`;
  }
}

function useCountdown(due_at: number) {
  const [remaining, setRemaining] = useState(due_at - Date.now());
  useState(() => {
    const iv = setInterval(() => setRemaining(due_at - Date.now()), 1000);
    return () => clearInterval(iv);
  });
  if (remaining <= 0) return 'Due now';
  const secs = Math.floor(remaining / 1000) % 60;
  const mins = Math.floor(remaining / 60000) % 60;
  const hrs = Math.floor(remaining / 3600000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function CountdownBadge({ due_at }: { due_at: number }) {
  const text = useCountdown(due_at);
  const isPast = due_at <= Date.now();
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
      isPast ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'
    }`}>
      {isPast ? 'Executing…' : text}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  executed: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function ScheduleTab() {
  const { status, scheduledPayments, schedulePayment, cancelScheduled } = useWallet();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ to: '', amount: '', coinId: 'UCT', delay: '5' });
  const [scheduling, setScheduling] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSchedule = async () => {
    if (!form.to || !form.amount || !form.delay) {
      setFormError('All fields are required');
      return;
    }
    const amtRaw = Math.round(parseFloat(form.amount) * 1_000_000);
    if (isNaN(amtRaw) || amtRaw <= 0) {
      setFormError('Invalid amount');
      return;
    }
    const delay = parseFloat(form.delay);
    if (isNaN(delay) || delay < 0) {
      setFormError('Invalid delay');
      return;
    }
    setScheduling(true);
    setFormError('');
    try {
      const due_at = Date.now() + delay * 60000;
      const to = form.to.startsWith('@') ? form.to : `@${form.to}`;
      await schedulePayment(to, amtRaw.toString(), form.coinId, due_at);
      setForm({ to: '', amount: '', coinId: 'UCT', delay: '5' });
      setShowForm(false);
    } catch (e: any) {
      setFormError(e?.message ?? 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  };

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <Calendar className="w-12 h-12 text-orange-500/30" />
        <p className="text-gray-500">Connect your wallet to schedule payments</p>
      </div>
    );
  }

  const pending = scheduledPayments.filter(p => p.status === 'pending');
  const past = scheduledPayments.filter(p => p.status !== 'pending');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          Scheduled Payments
        </h2>
        <motion.button
          onClick={() => setShowForm(f => !f)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm text-orange-400 hover:bg-orange-500/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-black/60 border border-orange-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-orange-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Schedule a Payment (Astrid will execute)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input
                    value={form.to}
                    onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                    placeholder="Recipient (@alice)"
                    className="w-full bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <input
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Amount (e.g. 5)"
                  className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                />
                <select
                  value={form.coinId}
                  onChange={e => setForm(f => ({ ...f, coinId: e.target.value }))}
                  className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-orange-400 focus:outline-none focus:border-orange-500/50"
                >
                  <option value="UCT">UCT</option>
                </select>
                <div className="col-span-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <input
                    value={form.delay}
                    onChange={e => setForm(f => ({ ...f, delay: e.target.value }))}
                    placeholder="Delay (minutes)"
                    type="number"
                    min="0"
                    className="flex-1 bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                  />
                  <span className="text-xs text-gray-500">minutes from now</span>
                </div>
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-2">
                <motion.button
                  onClick={handleSchedule}
                  disabled={scheduling}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm text-orange-400 hover:bg-orange-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {scheduling ? 'Scheduling…' : 'Schedule'}
                </motion.button>
                <button
                  onClick={() => { setShowForm(false); setFormError(''); }}
                  className="px-3 py-2 border border-gray-700 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending payments */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Pending ({pending.length})</p>
          <div className="space-y-2">
            <AnimatePresence>
              {pending.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-4 bg-black/40 border border-orange-500/15 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white font-mono">
                        {formatAmount(p.amount, p.coinId)}
                      </span>
                      <span className="text-xs text-gray-500">→</span>
                      <span className="text-sm text-orange-400">{p.to}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CountdownBadge due_at={p.due_at} />
                      <span className="text-xs text-gray-600">
                        at {new Date(p.due_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => cancelScheduled(p.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Past payments */}
      {past.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">History ({past.length})</p>
          <div className="space-y-2">
            {past.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-black/20 border border-gray-800 rounded-xl opacity-70">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  p.status === 'executed' ? 'bg-green-500/10' : p.status === 'failed' ? 'bg-red-500/10' : 'bg-gray-500/10'
                }`}>
                  {p.status === 'executed' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                   p.status === 'failed' ? <XCircle className="w-4 h-4 text-red-400" /> :
                   <X className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400 font-mono">{formatAmount(p.amount, p.coinId)} → {p.to}</p>
                  <p className="text-xs text-gray-600">{new Date(p.due_at).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {scheduledPayments.length === 0 && !showForm && (
        <div className="text-center py-12">
          <Calendar className="w-10 h-10 text-orange-500/20 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No scheduled payments yet</p>
          <p className="text-gray-700 text-xs mt-1">Create one to let Astrid execute it automatically</p>
        </div>
      )}

      <div className="text-xs text-gray-700 text-center pt-2">
        Scheduled payments are executed autonomously by Astrid every 30s check
      </div>
    </div>
  );
}
