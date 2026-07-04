import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, XCircle, AlertCircle, Info, DollarSign, Shield, ExternalLink, Zap } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const ENTRY_ICONS: Record<string, any> = {
  budget_check: DollarSign,
  approval: Shield,
  sent: Zap,
  confirmed: CheckCircle2,
  error: XCircle,
  info: Info,
};

const ENTRY_COLORS: Record<string, string> = {
  budget_check: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  approval: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  sent: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  confirmed: 'text-green-400 bg-green-500/10 border-green-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  info: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const ENTRY_LABELS: Record<string, string> = {
  budget_check: 'Budget Check',
  approval: 'Approval',
  sent: 'Payment Sent',
  confirmed: 'Confirmed',
  error: 'Error',
  info: 'Info',
};

function timeStr(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AstridTab() {
  const { astridLog, scheduledPayments } = useWallet();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [astridLog]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-orange-500/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-orange-500"
            />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Automation Engine</h2>
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-1.5 h-1.5 rounded-full ${astridLog.length > 0 ? 'bg-green-400' : 'bg-gray-600'}`}
              />
              <span className="text-xs text-gray-500">
                {astridLog.length > 0 ? 'Active' : 'Standby — waiting for scheduled payments'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Actions', val: astridLog.length },
            { label: 'Payments Executed', val: scheduledPayments.filter(p => p.status === 'executed').length },
            { label: 'Active Schedules', val: scheduledPayments.filter(p => p.status === 'pending').length },
          ].map(({ label, val }) => (
            <div key={label} className="bg-black/40 border border-orange-500/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-orange-400">{val}</p>
              <p className="text-xs text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {astridLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-2 border-dashed border-orange-500/20 flex items-center justify-center"
            >
              <Bot className="w-8 h-8 text-orange-500/30" />
            </motion.div>
            <div>
              <p className="text-gray-500 mb-1">SphereVoice is on standby</p>
              <p className="text-xs text-gray-700">Schedule a payment to watch SphereVoice work autonomously</p>
            </div>
            <div className="bg-black/40 border border-orange-500/10 rounded-xl p-4 text-left text-xs text-gray-600 space-y-1 max-w-xs">
              <p className="text-orange-500 font-medium mb-2">What happens automatically:</p>
              <p>① Checks wallet budget</p>
              <p>② Verifies approval policy</p>
              <p>③ Calls sphere.payments.send()</p>
              <p>④ Logs signed audit entries</p>
              <p>⑤ Links tx to SMT Explorer</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {[...astridLog].reverse().map((entry, i) => {
              const Icon = ENTRY_ICONS[entry.type] ?? Info;
              const colorClass = ENTRY_COLORS[entry.type] ?? ENTRY_COLORS.info;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 p-3 bg-black/40 border border-gray-800/50 rounded-xl hover:border-orange-500/15 transition-all"
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {i < astridLog.length - 1 && (
                      <div className="w-px h-4 bg-gray-800 mt-1" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-medium ${colorClass.split(' ')[0]}`}>
                        {ENTRY_LABELS[entry.type] ?? entry.type}
                      </span>
                      <span className="text-xs text-gray-700 font-mono flex-shrink-0">
                        {timeStr(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{entry.message}</p>
                    {entry.txId && (
                      <p className="text-xs text-orange-500/60 font-mono mt-0.5 truncate">
                        tx: {entry.txId.slice(0, 24)}…
                      </p>
                    )}
                    {entry.smtLink && (
                      <a
                        href={entry.smtLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 mt-1 transition-colors"
                      >
                        View on SMT Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-orange-500/10">
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
          <span>SphereVoice runs autonomously with no human present once triggered. All actions are logged above.</span>
        </div>
       
      </div>
    </div>
  );
}
