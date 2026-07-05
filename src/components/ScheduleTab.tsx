import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, Plus, Zap, CheckCircle2, XCircle, Loader2, RotateCcw } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import ScheduleModal from './ScheduleModal';

function formatAmount(raw: string, symbol = 'UCT'): string {
  try {
    const n = BigInt(raw);
    const divisor = 1_000_000_000_000_000_000n;
    const whole = n / divisor;
    const frac = n % divisor;
    if (frac === 0n) return `${whole.toLocaleString()} ${symbol}`;
    return `${whole.toLocaleString()}.${frac.toString().padStart(18, '0').replace(/0+$/, '')} ${symbol}`;
  } catch {
    return `${raw} ${symbol}`;
  }
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  executed: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function ScheduleTab() {
  const { status, nametag, directAddress } = useWallet();
  const myId = nametag ? `@${nametag}` : directAddress;
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => fetch('/api/schedule').then(r => r.json()).then(data => {
  const mine = data.filter((s: any) => s.funder === myId);
  setSchedules([...mine].sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
}).catch(() => {});

  useEffect(() => {
  load();
  const iv = setInterval(load, 10000);
  return () => clearInterval(iv);
}, [myId]);

  const cancelJob = async (id: string) => {
    setLoadingId(id);
    await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    });
    await load();
    setLoadingId(null);
  };

  const refundJob = async (id: string) => {
    setLoadingId(id);
    await fetch('/api/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    setLoadingId(null);
  };

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <Calendar className="w-12 h-12 text-orange-500/30" />
        <p className="text-gray-500">Connect your wallet to schedule payments</p>
      </div>
    );
  }

  const running = schedules.filter(s => s.status === 'pending');
  const completed = schedules.filter(s => s.status === 'executed');
  const cancelled = schedules.filter(s => s.status === 'cancelled');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          Scheduled Payments
        </h2>
        <motion.button
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm text-orange-400 hover:bg-orange-500/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </motion.button>
      </div>

     {showForm && (
  <ScheduleModal
    initial={{ to: '', amount: '1', coinId: 'UCT' }}
    onClose={() => setShowForm(false)}
    onScheduled={() => { setShowForm(false); load(); }}
  />
)}

      {/* Running */}
      {running.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Running ({running.length})</p>
          <div className="space-y-2">
            <AnimatePresence>
              {running.map(s => (
                <motion.div
                  key={s.id}
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
                        {formatAmount(s.amount, s.coinId)}
                      </span>
                      <span className="text-xs text-gray-500">→</span>
                      <span className="text-sm text-orange-400">{s.to}</span>
                    </div>
                   <div className="text-xs text-gray-600 mt-1">
  {s.rule?.type === 'once' ? (
    <>Runs at: {new Date(s.rule.due_at).toLocaleString()}</>
  ) : (
    <>
      Cycle {s.cyclesDone ?? 0} / {s.rule?.totalCycles ?? '?'} · every {Math.round((s.rule?.intervalMs ?? 0)/1000)}s
      <br />Next: {new Date(s.lastRun ? s.lastRun + (s.rule?.intervalMs ?? 0) : (s.rule?.startAt ?? s.createdAt)).toLocaleString()}
    </>
  )}
</div>
                  </div>
                  <motion.button
                    onClick={() => cancelJob(s.id)}
                    disabled={loadingId === s.id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  >
                    {loadingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

       {/* Completed */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Completed ({completed.length})</p>
          <div className="space-y-2">
            {completed.map(s => (
              <div key={s.id} className="bg-black/20 border border-gray-800 rounded-xl overflow-hidden opacity-90">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 font-mono">{formatAmount(s.amount, s.coinId)} → {s.to}</p>
                    <p className="text-xs text-gray-600">{s.cyclesDone} / {s.rule?.totalCycles} sent · tap for details</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                </div>
                {expandedId === s.id && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-800 space-y-1.5">
                    <p className="text-xs text-gray-500">Created: {new Date(s.createdAt).toLocaleString()}</p>
                    {(s.history ?? []).map((h: any, i: number) => (
                      <p key={i} className="text-xs text-green-400">
                        Payment {h.cycle}: {formatAmount(h.amount, s.coinId)} sent {new Date(h.timestamp).toLocaleString()} — {h.status}
                        {h.txId && <a href={`https://unicitynetwork.github.io/smt-explorer/?tx=${h.txId}`} target="_blank" rel="noreferrer" className="text-orange-500 ml-1">↗</a>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Cancelled (with refund option) */}
      {cancelled.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Cancelled ({cancelled.length})</p>
          <div className="space-y-2">
            {cancelled.map(s => (
              <div key={s.id} className="bg-black/20 border border-gray-800 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center">
                    <X className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 font-mono">{formatAmount(s.amount, s.coinId)} → {s.to}</p>
                    <p className="text-xs text-gray-600">
                      {(s.cyclesDone ?? 0)} / {s.rule?.totalCycles ?? 1} sent
                      {s.refunded ? ' · refunded' : ''} · tap for details
                    </p>
                  </div>
                  {!s.refunded && (s.cyclesDone ?? 0) < (s.rule?.totalCycles ?? 1) && (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); refundJob(s.id); }}
                      disabled={loadingId === s.id}
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-orange-500/30 text-orange-400 text-xs disabled:opacity-40"
                    >
                      {loadingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Refund
                    </motion.button>
                  )}
                </div>
                {expandedId === s.id && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-800 space-y-1.5">
                    <p className="text-xs text-gray-500">Created: {new Date(s.createdAt).toLocaleString()}</p>
                    {(s.history ?? []).map((h: any, i: number) => (
                      <p key={i} className="text-xs text-green-400">
                        Payment {h.cycle}: {formatAmount(h.amount, s.coinId)} sent {new Date(h.timestamp).toLocaleString()} — {h.status}
                        {h.txId && <a href={`https://unicitynetwork.github.io/smt-explorer/?tx=${h.txId}`} target="_blank" rel="noreferrer" className="text-orange-500 ml-1">↗</a>}
                      </p>
                    ))}
                    {(!s.history || s.history.length === 0) && <p className="text-xs text-gray-600">No payments sent before cancellation</p>}
                    {s.refunded && (
                      <p className="text-xs text-yellow-400">
                        Refunded {formatAmount(s.refundAmount ?? '0', s.coinId)} at {s.refundedAt ? new Date(s.refundedAt).toLocaleString() : 'unknown time'}
                        {s.refundTxId && <a href={`https://unicitynetwork.github.io/smt-explorer/?tx=${s.refundTxId}`} target="_blank" rel="noreferrer" className="text-orange-500 ml-1">↗</a>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

     

      {schedules.length === 0 && !showForm && (
        <div className="text-center py-12">
          <Calendar className="w-10 h-10 text-orange-500/20 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No scheduled payments yet</p>
<p className="text-gray-700 text-xs mt-1">Create one to let SphereVoice execute it automatically</p>
        </div>
      )}

      <div className="text-xs text-gray-700 text-center pt-2">
        <Zap className="w-3 h-3 inline mr-1 text-orange-600" />
        Scheduled payments run server-side, 24/7 — no wallet approval needed once funded
      </div>
    </div>
  );
}