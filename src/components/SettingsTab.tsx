import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Wallet, User, Copy, CheckCircle, AlertTriangle, LogOut, ExternalLink, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export default function SettingsTab() {
  const {
    status, error, nametag, directAddress, generatedMnemonic,
    connectWallet, disconnectWallet, registerNametag, clearMnemonic
  } = useWallet();

  const [copied, setCopied] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [newNametag, setNewNametag] = useState('');
  const [nametagResult, setNametagResult] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try { await connectWallet(); } finally { setConnecting(false); }
  };

  const handleRegisterNametag = async () => {
    if (!newNametag.trim()) return;
    setRegistering(true);
    setNametagResult(null);
    const res = await registerNametag(newNametag.trim().toLowerCase().replace('@', ''));
    setNametagResult({ success: res.success, msg: res.success ? `@${newNametag} registered!` : res.error });
    if (res.success) setNewNametag('');
    setRegistering(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Settings className="w-5 h-5 text-orange-500" />
        Wallet Settings
      </h2>

      {/* Connection status card */}
      <div className="bg-black/40 border border-orange-500/15 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              status === 'connected' ? 'bg-green-500/10 border-green-500/20' :
              status === 'error' ? 'bg-red-500/10 border-red-500/20' :
              status === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/20' :
              'bg-gray-500/10 border-gray-500/20'
            }`}>
              <Wallet className={`w-5 h-5 ${
                status === 'connected' ? 'text-green-400' :
                status === 'error' ? 'text-red-400' :
                status === 'connecting' ? 'text-yellow-400' :
                'text-gray-500'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sphere Wallet</p>
              <p className={`text-xs ${
                status === 'connected' ? 'text-green-400' :
                status === 'error' ? 'text-red-400' :
                status === 'connecting' ? 'text-yellow-400 animate-pulse' :
                'text-gray-500'
              }`}>
                {status === 'connected' ? '● Connected to Testnet' :
                 status === 'error' ? '● Connection Error' :
                 status === 'connecting' ? '● Connecting…' :
                 '○ Not Connected'}
              </p>
            </div>
          </div>

          {status === 'connected' ? (
            <motion.button
              onClick={disconnectWallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </motion.button>
          ) : (
            <motion.button
              onClick={handleConnect}
              disabled={connecting || status === 'connecting'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm text-orange-400 hover:bg-orange-500/30 transition-all disabled:opacity-50"
            >
              {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </motion.button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/20 rounded-lg text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Identity info */}
        {status === 'connected' && (
          <div className="space-y-3 pt-2 border-t border-orange-500/10">
            {nametag && (
              <div className="flex items-center justify-between p-3 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-gray-500">Nametag</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-300 font-medium">@{nametag}</span>
                  <button onClick={() => copyToClipboard(`@${nametag}`, 'nametag')} className="text-gray-600 hover:text-orange-400 transition-colors">
                    {copied === 'nametag' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {directAddress && (
              <div className="p-3 bg-black/40 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">L3 Direct Address</span>
                  <button onClick={() => copyToClipboard(directAddress, 'addr')} className="text-gray-600 hover:text-orange-400 transition-colors">
                    {copied === 'addr' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-mono break-all leading-relaxed">{directAddress}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recovery phrase warning */}
      <AnimatePresence>
        {generatedMnemonic && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-950/40 border border-yellow-500/30 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-semibold">Save Your Recovery Phrase!</p>
            </div>
            <p className="text-xs text-yellow-200/70">
              A new wallet was created. Write down these 12 words in order. This is the ONLY way to recover your wallet.
            </p>
            <div className="relative">
              <div className={`p-3 bg-black/40 border border-yellow-500/20 rounded-lg font-mono text-sm leading-relaxed transition-all ${showMnemonic ? 'text-yellow-200' : 'blur-sm select-none text-yellow-200'}`}>
                {generatedMnemonic}
              </div>
              <button
                onClick={() => setShowMnemonic(s => !s)}
                className="absolute top-2 right-2 text-yellow-500 hover:text-yellow-300 transition-colors"
              >
                {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(generatedMnemonic, 'mnemonic')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 hover:bg-yellow-500/20 transition-all"
              >
                {copied === 'mnemonic' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === 'mnemonic' ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={clearMnemonic}
                className="px-3 py-1.5 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/10 transition-all"
              >
                I've saved it ✓
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register Nametag */}
      {status === 'connected' && !nametag && (
        <div className="bg-black/40 border border-orange-500/15 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <User className="w-4 h-4 text-orange-500" />
            Register Nametag
          </p>
          <p className="text-xs text-gray-600">Choose a unique @name to receive payments (e.g. "alice", "bob123")</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-black/40 border border-orange-500/20 rounded-lg overflow-hidden focus-within:border-orange-500/50">
              <span className="text-orange-400 pl-3 text-sm">@</span>
              <input
                value={newNametag}
                onChange={e => setNewNametag(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="yournametag"
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
                maxLength={20}
              />
            </div>
            <motion.button
              onClick={handleRegisterNametag}
              disabled={registering || !newNametag}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-sm text-orange-400 hover:bg-orange-500/30 transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Register
            </motion.button>
          </div>
          {nametagResult && (
            <p className={`text-xs ${nametagResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {nametagResult.success ? '✓' : '✗'} {nametagResult.msg}
            </p>
          )}
        </div>
      )}

      {/* Links */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider">Resources</p>
        {[
          { label: 'SMT Explorer', href: 'https://unicitynetwork.github.io/smt-explorer/', desc: 'Verify transactions on-chain' },
          { label: 'Sphere SDK', href: 'https://github.com/unicity-sphere/sphere-sdk', desc: 'Developer docs' },
          { label: 'Astrid Agent', href: 'https://github.com/unicity-astrid/astrid', desc: 'Autonomous agent framework' },
        ].map(link => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3 bg-black/20 border border-gray-800 rounded-xl hover:border-orange-500/20 hover:bg-black/40 transition-all group"
          >
            <div>
              <p className="text-sm text-gray-300 group-hover:text-orange-300 transition-colors">{link.label}</p>
              <p className="text-xs text-gray-600">{link.desc}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-500 transition-colors" />
          </a>
        ))}
      </div>

      {/* Network info */}
      <div className="p-3 bg-black/40 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-orange-500" />
          <p className="text-xs font-medium text-gray-400">Network Info</p>
        </div>
        <div className="space-y-1 text-xs font-mono text-gray-600">
          <p>Network: <span className="text-orange-500/70">testnet2 (v2 engine)</span></p>
          <p>Gateway: <span className="text-orange-500/70">gateway.testnet2.unicity.network</span></p>
          <p>Wallet API: <span className="text-orange-500/70">wallet-api.unicity.network</span></p>
          <p>Oracle Key: <span className="text-orange-500/70">sk_ddc3cfc…(public)</span></p>
        </div>
      </div>
    </div>
  );
}
