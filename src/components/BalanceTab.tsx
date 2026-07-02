import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Coins, TrendingUp, Zap, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

function formatAmount(raw: string | bigint, decimals = 6): string {
  const n = typeof raw === 'bigint' ? raw : BigInt(raw.toString());
  const div = BigInt(10 ** decimals);
  const whole = n / div;
  const frac = n % div;
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toLocaleString()}.${fracStr}`;
}

export default function BalanceTab() {
  const { status, assets, refreshBalance, mintTokens } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintAmt, setMintAmt] = useState('1000');
  const [mintCoin, setMintCoin] = useState('UCT');
  const [mintResult, setMintResult] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);


  
  const handleRefresh = async () => {
    if (refreshing || status !== 'connected') return;
    setRefreshing(true);
    setError(null);
    try {
      await refreshBalance();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMint = async () => {
    if (minting || status !== 'connected') return;
    setMinting(true);
    setMintResult(null);
    try {
      const mintAsset = assets.find((a: any) => a.symbol?.toUpperCase() === mintCoin.toUpperCase());
      const decimals = mintAsset?.decimals ?? 18;
      const raw = Math.round(parseFloat(mintAmt) * (10 ** decimals));
      if (isNaN(raw) || raw <= 0) throw new Error('Invalid amount');
      const result = await mintTokens(mintCoin, BigInt(raw));
      setMintResult({ success: result.success, msg: result.success ? `Minted! Token: ${result.tokenId?.slice(0, 16) ?? 'N/A'}…` : result.error ?? 'Mint failed' });
    } catch (e: any) {
      setMintResult({ success: false, msg: e?.message ?? 'Mint failed' });
    } finally {
      setMinting(false);
    }
  };

React.useEffect(() => {
    if (status !== 'connected') return;
    const iv = setInterval(() => { refreshBalance().catch(() => {}); }, 5000);
    return () => clearInterval(iv);
  }, [status, refreshBalance]);


  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center"
        >
          <Coins className="w-8 h-8 text-orange-500/50" />
        </motion.div>
        <p className="text-gray-500">Connect your wallet to see balances</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Live Balance
          <span className="text-xs text-orange-500/60 font-mono">testnet</span>
        </h2>
        <motion.button
          onClick={handleRefresh}
          disabled={refreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Total overview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-950/40 to-black border border-orange-500/20 p-6"
      >
        {/* Animated bg glow */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-orange-500/10 rounded-2xl"
        />
        <div className="relative">
          <p className="text-sm text-gray-500 mb-1">Total Portfolio</p>
         <p className="text-4xl font-bold text-white font-mono">
            ${assets.reduce((sum, a: any) => sum + (a.fiatValueUsd ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-orange-400 mt-1">Total value • Unicity Testnet</p>
          <div className="flex items-center gap-1.5 mt-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
            <span className="text-xs text-green-400">Live from testnet</span>
          </div>
        </div>
      </motion.div>

      {/* Asset cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {assets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-600"
            >
              <Coins className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p>No assets yet. Mint test tokens below.</p>
            </motion.div>
          ) : (
            assets.map((asset, i) => {
              const amt = formatAmount(asset.totalAmount?.toString() ?? '0', asset.decimals ?? 18);
              return (
                <motion.div
                  key={asset.coinId ?? i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-4 bg-black/40 border border-orange-500/10 rounded-xl hover:border-orange-500/25 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://cryptologos.cc/logos/${(asset.symbol ?? '').toLowerCase()}-${(asset.symbol ?? '').toLowerCase()}-logo.png`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        alt={asset.symbol}
                        className="w-full h-full object-contain p-1"
                      />
                      <span className="text-xs font-bold text-orange-400 hidden">{(asset.symbol ?? 'T').slice(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{asset.symbol ?? asset.coinId?.slice(0, 8) ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500 font-mono">{asset.coinId?.slice(0, 20) ?? '—'}…</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-300 font-mono">{amt}</p>
                    <p className="text-xs text-gray-600">testnet units</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Mint section */}
      <div className="border-t border-orange-500/10 pt-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          Self-Mint Test Tokens
        </h3>
        <div className="flex gap-2">
          <input
            value={mintAmt}
            onChange={(e) => setMintAmt(e.target.value)}
            className="flex-1 bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
            placeholder="Amount"
          />
          <select
            value={mintCoin}
            onChange={(e) => setMintCoin(e.target.value)}
            className="bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-orange-400 focus:outline-none focus:border-orange-500/50"
          >
            <option value="UCT">UCT</option>
          </select>
          <motion.button
            onClick={handleMint}
            disabled={minting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm hover:bg-orange-500/30 transition-all disabled:opacity-40"
          >
            {minting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Mint
          </motion.button>
        </div>
        <AnimatePresence>
          {mintResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-2 p-2 rounded-lg text-xs font-mono ${mintResult.success ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'}`}
            >
              {mintResult.success ? '✓' : '✗'} {mintResult.msg}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-xs text-gray-700 mt-2">Real on-chain token mint via Sphere SDK → Unicity testnet.</p>
      </div>
    </div>
  );
}
