import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowUpRight, ArrowDownLeft, Layers, ExternalLink, Loader2, Clock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

function formatAmount(raw: string, symbol = 'UCT'): string {
  try {
    const n = BigInt(raw);
    const DECIMALS = 1_000_000_000_000_000_000n; // 12 decimals
    const whole = n / DECIMALS;
    const frac = n % DECIMALS;
    if (frac === 0n) return `${whole.toLocaleString()} ${symbol}`;
    return `${whole.toLocaleString()}.${frac.toString().padStart(18, '0').replace(/0+$/, '')} ${symbol}`;
  } catch {
    return `${raw} ${symbol}`;
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HistoryTab() {
  const { status, transfers, refreshHistory } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'connected') {
      handleRefresh();
    }
  }, [status]);

  const handleRefresh = async () => {
    if (loading || status !== 'connected') return;
    setLoading(true);
    setError(null);
    try {
      await refreshHistory();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <Clock className="w-12 h-12 text-orange-500/30" />
        <p className="text-gray-500">Connect your wallet to see transaction history</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-500" />
          Transaction History
        </h2>
        <motion.button
          onClick={handleRefresh}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Loading…' : 'Refresh'}
        </motion.button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <AnimatePresence>
        {transfers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-orange-500/30" />
            </div>
            <p className="text-gray-500 mb-2">No transactions yet</p>
            <p className="text-xs text-gray-700">Mint tokens or send a payment to create history</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {transfers.map((tx, i) => {
              const isOut = tx.type === 'sent';
              const isMint = tx.type === 'mint';
              const smtLink = tx.txId ? `https://unicitynetwork.github.io/smt-explorer/?tx=${tx.txId}` : null;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-4 bg-black/40 border border-orange-500/10 rounded-xl hover:border-orange-500/25 transition-all group"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isMint
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : isOut
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    {isMint
                      ? <Layers className="w-5 h-5 text-blue-400" />
                      : isOut
                        ? <ArrowUpRight className="w-5 h-5 text-red-400" />
                        : <ArrowDownLeft className="w-5 h-5 text-green-400" />}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isMint ? 'text-blue-300' : isOut ? 'text-red-300' : 'text-green-300'
                      }`}>
                        {isMint ? 'Minted' : isOut ? 'Sent' : 'Received'}
                      </span>
                      {tx.status && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                          {tx.status}
                        </span>
                      )}
                    </div>
                    {tx.counterpart && (
                      <p className="text-xs text-gray-500 truncate">
                        {isOut ? 'To:' : 'From:'} <span className="text-orange-400/70">{tx.counterpart}</span>
                      </p>
                    )}
                    {tx.txId && (
                      <p className="text-xs text-gray-700 font-mono truncate">{tx.txId.slice(0, 24)}…</p>
                    )}
                  </div>

                  {/* Amount + time */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold font-mono ${
                      isMint ? 'text-blue-300' : isOut ? 'text-red-300' : 'text-green-300'
                    }`}>
                      {isMint ? '+' : isOut ? '-' : '+'}{formatAmount(tx.amount, tx.symbol ?? tx.coinId)}
                    </p>
                    <p className="text-xs text-gray-600">{timeAgo(tx.timestamp)}</p>
                    {smtLink && (
                      <a
                        href={smtLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-orange-600 hover:text-orange-400 transition-colors mt-0.5"
                      >
                        SMT Explorer <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {transfers.length > 0 && (
        <p className="text-xs text-gray-700 text-center">
          Showing {transfers.length} transaction{transfers.length !== 1 ? 's' : ''} •{' '}
          <a href="https://unicitynetwork.github.io/smt-explorer/" target="_blank" rel="noreferrer" className="text-orange-600 hover:text-orange-500">
            Verify on SMT Explorer ↗
          </a>
        </p>
      )}
    </div>
  );
}
