import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, TrendingUp, Clock, Calendar, Eye, Settings,
  Wallet, Globe, ChevronRight
} from 'lucide-react';
import { WalletProvider, useWallet } from './context/WalletContext';
import AnimatedBackground from './components/AnimatedBackground';
import ChatTab from './components/ChatTab';
import BalanceTab from './components/BalanceTab';
import HistoryTab from './components/HistoryTab';
import ScheduleTab from './components/ScheduleTab';
import AstridTab from './components/AstridTab';
import SettingsTab from './components/SettingsTab';

type TabId = 'chat' | 'balance' | 'history' | 'schedule' | 'astrid' | 'settings';

const TABS: { id: TabId; label: string; icon: any; shortLabel: string }[] = [
  { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: MessageSquare },
  { id: 'balance', label: 'Balance', shortLabel: 'Balance', icon: TrendingUp },
  { id: 'history', label: 'History', shortLabel: 'History', icon: Clock },
  { id: 'schedule', label: 'Schedule', shortLabel: 'Schedule', icon: Calendar },
  { id: 'astrid', label: 'Automation Log', shortLabel: 'Astrid', icon: Eye },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

const TAB_COMPONENTS: Record<TabId, React.ReactElement> = {
  chat: <ChatTab />,
  balance: <BalanceTab />,
  history: <HistoryTab />,
  schedule: <ScheduleTab />,
  astrid: <AstridTab />,
  settings: <SettingsTab />,
};

function WalletStatusBar() {
  const { status, nametag, directAddress, connectWallet, disconnectWallet } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const [hover, setHover] = useState(false);
  const handleConnect = async () => { setConnecting(true); try { await connectWallet(); } finally { setConnecting(false); } };

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center gap-2"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <motion.div animate={{ scale: status === 'connecting' ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 1, repeat: status === 'connecting' ? Infinity : 0 }}
          className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400' : status === 'connecting' ? 'bg-yellow-400' : status === 'error' ? 'bg-red-400' : 'bg-gray-600'}`} />
        <span className="text-xs text-gray-500 hidden sm:block font-mono cursor-default">
          {status === 'connected' ? (nametag ? `@${nametag}` : directAddress ? directAddress.slice(0,16)+'…' : 'Connected')
            : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Error' : 'Disconnected'}
        </span>

        {status === 'connected' && hover && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={disconnectWallet}
            className="absolute top-full right-0 mt-2 whitespace-nowrap px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition-all z-50"
          >
            Disconnect
          </motion.button>
        )}
      </div>
      {status !== 'connected' && (
        <button onClick={handleConnect} disabled={connecting || status === 'connecting'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-xs text-orange-400 hover:bg-orange-500/30 transition-all disabled:opacity-50">
          <Wallet className="w-3.5 h-3.5" />
          {connecting || status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
}

function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative">
      {/* Logo orb */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 1, type: 'spring', stiffness: 80 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-2xl shadow-orange-500/30">
          <Globe className="w-12 h-12 text-white" />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-3xl border-2 border-orange-500/30"
          style={{ borderRadius: '28px' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-3 rounded-[40px] border border-orange-500/15"
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-6xl md:text-8xl font-black mb-4 tracking-tight"
      >
        <span className="text-white">Sphere</span>
        <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">Voice</span>
      </motion.h1>

      {/* Animated tagline words */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mb-3"
      >
        <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl">
          Talk to your{' '}
          <AnimatedWord
            words={['Unicity wallet', 'blockchain assets', 'digital tokens', 'on-chain world']}
          />
          {' '}in plain English
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="text-sm text-orange-500/60 mb-10 font-mono"
      >
        Watch SphereVoice handle the rest, autonomously and on-chain
      </motion.p>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="flex flex-wrap justify-center gap-2 mb-10"
      >
        {[
          { icon: '🔴', label: 'Real Testnet' },
          { icon: '🤖', label: 'Astrid Agent' },
          { icon: '💬', label: 'AI Chat' },
          { icon: '⚡', label: 'Instant Send' },
          { icon: '🗓️', label: 'Schedule' },
          { icon: '🔍', label: 'SMT Explorer' },
        ].map((feat, i) => (
          <motion.div
            key={feat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 + i * 0.1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-sm text-orange-300"
          >
            <span>{feat.icon}</span>
            <span>{feat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.button
        onClick={onStart}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(249,115,22,0.4)' }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl text-white font-semibold text-lg shadow-xl shadow-orange-500/25 overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Wallet className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Launch App</span>
        <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
      </motion.button>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 text-gray-700 text-xs"
      >
        ↓ No mock data — every number is real testnet
      </motion.div>
    </div>
  );
}

function AnimatedWord({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  useState(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % words.length), 2500);
    return () => clearInterval(iv);
  });
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
        transition={{ duration: 0.5 }}
        className="inline-block text-orange-400 font-medium"
      >
        {words[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [showHero, setShowHero] = useState(true);
  const { astridLog, scheduledPayments } = useWallet();

  const astridUnread = astridLog.filter(l => l.type === 'confirmed').length;
  const pendingSchedules = scheduledPayments.filter(p => p.status === 'pending').length;

  if (showHero) {
    return (
      <>
        <AnimatedBackground />
        <HeroSection onStart={() => setShowHero(false)} />
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 h-screen flex flex-col"
      >
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-orange-500/10 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHero(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                Sphere<span className="text-orange-500">Voice</span>
              </span>
            </button>
            <div className="hidden sm:flex items-center gap-1 text-xs text-orange-500/50">
              <span>•</span>
              <span className="font-mono">testnet2</span>
            </div>
          </div>

          <WalletStatusBar />
        </header>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar nav */}
          <nav className="hidden md:flex flex-col gap-1 p-3 w-52 border-r border-orange-500/10 bg-black/20 backdrop-blur-xl">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = tab.id === 'astrid' ? astridUnread : tab.id === 'schedule' ? pendingSchedules : 0;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-xl bg-orange-500/10"
                    />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-400' : ''}`} />
                  <span className="truncate">{tab.label}</span>
                  {badge > 0 && (
                    <span className="ml-auto text-xs bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {badge}
                    </span>
                  )}
                </motion.button>
              );
            })}

            {/* Quick stats */}
            <div className="mt-auto pt-4 border-t border-orange-500/10 space-y-2">
              <div className="px-3">
                <p className="text-xs text-gray-700 mb-1">Network</p>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-orange-500"
                  />
                  <span className="text-xs text-orange-500/70 font-mono">Unicity Testnet2</span>
                </div>
              </div>
              <div className="px-3">
                <p className="text-xs text-gray-700 mb-1">SDK</p>
                <span className="text-xs text-gray-600 font-mono">@unicitylabs/sphere-sdk</span>
              </div>
            </div>
          </nav>

          {/* Content area */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {/* Tab label bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-orange-500/5 bg-black/10">
              {(() => {
                const tab = TABS.find(t => t.id === activeTab)!;
                const Icon = tab.icon;
                return (
                  <>
                    <Icon className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-gray-400">{tab.label}</span>
                    {activeTab === 'chat' && (
                      <span className="ml-1 text-xs text-gray-700">— plain English → real SDK calls</span>
                    )}
                    {activeTab === 'balance' && (
                      <span className="ml-1 text-xs text-gray-700">— live from sphere.payments.getAssets()</span>
                    )}
                    {activeTab === 'history' && (
                      <span className="ml-1 text-xs text-gray-700">— real on-chain transactions</span>
                    )}
                    {activeTab === 'astrid' && (
                      <span className="ml-1 text-xs text-orange-600">— autonomous agent execution feed</span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  {TAB_COMPONENTS[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden flex border-t border-orange-500/10 bg-black/60 backdrop-blur-xl">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'astrid' ? astridUnread : tab.id === 'schedule' ? pendingSchedules : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-all ${
                  isActive ? 'text-orange-400' : 'text-gray-600'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute top-0 inset-x-0 h-0.5 bg-orange-500 rounded-full"
                  />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </motion.div>
    </>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppShell />
    </WalletProvider>
  );
}
