import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ConnectClient, ConnectResult } from '@unicitylabs/sphere-sdk/connect';
export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
const KNOWN_COIN_IDS: Record<string, string> = {
  UCT: 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0',
};
export interface Asset {
  coinId: string;
  symbol: string;
  totalAmount: bigint | string;
  decimals?: number;
}

export interface TransferRecord {
  id: string;
  type: 'sent' | 'received' | 'mint';
  amount: string;
  coinId: string;
  symbol?: string;
  counterpart?: string;
  timestamp: number;
  status: string;
  txId?: string;
}

export interface ScheduledPayment {
  id: string;
  to: string;
  amount: string;
  coinId: string;
  due_at: number;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  created_at: number;
}

export interface AstridLogEntry {
  id: string;
  timestamp: number;
  type: 'budget_check' | 'approval' | 'sent' | 'confirmed' | 'error' | 'info';
  message: string;
  txId?: string;
  smtLink?: string;
  paymentId?: string;
}

interface WalletContextValue {
  sphere: any | null;
  status: WalletStatus;
  error: string | null;
  nametag: string | null;
  directAddress: string | null;
  generatedMnemonic: string | null;
  assets: Asset[];
  transfers: TransferRecord[];
  scheduledPayments: ScheduledPayment[];
  astridLog: AstridLogEntry[];
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
  refreshHistory: () => Promise<TransferRecord[]>;
  sendPayment: (recipient: string, amount: string, coinId: string, memo?: string) => Promise<{ status: string; txId?: string }>;
  mintTokens: (coinId: string, amount: bigint) => Promise<{ success: boolean; tokenId?: string; error?: string }>;
  registerNametag: (name: string) => Promise<{ success: boolean; error?: string }>;
  schedulePayment: (to: string, amount: string, coinId: string, due_at: number) => Promise<void>;
  cancelScheduled: (id: string) => void;
  addAstridLog: (entry: Omit<AstridLogEntry, 'id' | 'timestamp'>) => void;
  clearMnemonic: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sphere, setSphere] = useState<any | null>(null);
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [nametag, setNametag] = useState<string | null>(null);
  const [directAddress, setDirectAddress] = useState<string | null>(null);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [astridLog, setAstridLog] = useState<AstridLogEntry[]>([]);
  const sphereRef = useRef<any>(null);
  // keep executeScheduledPayment stable across renders
  const executeRef = useRef<((p: ScheduledPayment) => Promise<void>) | undefined>(undefined);

  const addAstridLog = useCallback((entry: Omit<AstridLogEntry, 'id' | 'timestamp'>) => {
    const full: AstridLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    };
    setAstridLog(prev => [full, ...prev].slice(0, 100));
  }, []);

  const disconnectWallet = useCallback(() => {
    try { sphereRef.current?.disconnect?.(); } catch (_) {}
    sphereRef.current = null;
    setSphere(null);
    setStatus('disconnected');
    setNametag(null);
    setDirectAddress(null);
    setGeneratedMnemonic(null);
    setAssets([]);
    setTransfers([]);
    setError(null);
  }, []);

  const connectWallet = useCallback(async (silentOnly = false) => {
    setStatus('connecting');
    setError(null);
    try {
      const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');
      const { SPHERE_NETWORKS } = await import('@unicitylabs/sphere-sdk/connect');

      let client!: ConnectClient;
      let connection!: ConnectResult;
      for (let i = 0; i < 3; i++) {
        try {
          const res = await autoConnect({
            dapp: { name: 'SphereVoice', url: window.location.origin },
            walletUrl: 'https://sphere.unicity.network',
            network: SPHERE_NETWORKS.testnet2,
           silent: silentOnly,
            permissions: [
  'identity:read',
  'balance:read',
  'history:read',
  'transfer:request',
  'mint:request',
  'resolve:peer',
],
          });
          client = res.client;
          connection = res.connection;
          break;
        } catch (e) {
          if (i === 2) throw e;
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }

      sphereRef.current = client;

      client.on('identity:changed', (data: any) => {
        setDirectAddress(data?.directAddress ?? null);
        setNametag(data?.nametag ?? null);
      });
      client.on('wallet:locked', () => disconnectWallet());

      setDirectAddress(connection.identity?.directAddress ?? null);
      setNametag(connection.identity?.nametag ?? null);
      setSphere(client);
      setStatus('connected');

      try {
        const a = await client.query('sphere_getAssets');
        setAssets((a as any) ?? []);
      } catch (_) { /* balance fetch is best-effort */ }

    } catch (err: any) {
      setStatus('error');
      const code = err?.code;
      setError(code ? `Connect failed (${code}): ${err.message}` : err?.message ?? 'Failed to connect wallet');
      console.error('Wallet connect error:', code, err);
    }
  }, [disconnectWallet]);

  const refreshBalance = useCallback(async () => {
    if (!sphereRef.current) throw new Error('Wallet not connected');
    const a = await sphereRef.current.query('sphere_getAssets');
    setAssets((a as any) ?? []);
  }, []);

  const refreshHistory = useCallback(async () => {
  if (!sphereRef.current) throw new Error('Wallet not connected');
  const result: any = await sphereRef.current.query('sphere_getHistory');
  console.log('RAW HISTORY:', JSON.stringify(result, null, 2));
 const rawHistory: TransferRecord[] = ((result?.transfers ?? result ?? [])).map((t: any) => ({
  id: t.id ?? generateId(),
  type: t.type === 'SENT' ? 'sent' : t.type === 'RECEIVED' ? 'received' : 'mint',
  amount: t.amount?.toString() ?? '0',
  coinId: t.coinId ?? 'UCT',
  symbol: t.symbol ?? 'UCT',
  counterpart: t.type === 'SENT' ? (t.recipientNametag ?? 'Unknown') : (t.senderNametag ?? 'Unknown'),
  timestamp: t.timestamp ?? Date.now(),
  status: t.status ?? 'confirmed',
  txId: t.transferId ?? t.id,
}));
  if (rawHistory.length > 0) setTransfers(rawHistory);
  return rawHistory;
}, []);

const sendPayment = useCallback(async (recipient: string, amount: string, coinId: string, memo?: string) => {
    if (!sphereRef.current) throw new Error('Wallet not connected');
    console.log('DEBUG assets:', JSON.stringify(assets));
   const matchedAsset = assets.find((a: any) => a.symbol?.toUpperCase() === coinId?.toUpperCase() || a.coinId === coinId);
const hexCoinId = matchedAsset?.coinId ?? KNOWN_COIN_IDS[coinId?.toUpperCase()] ?? coinId;
    console.log('DEBUG hexCoinId being sent:', hexCoinId);
    const result: any = await sphereRef.current.intent('send', {
      to: recipient,
      recipient,
      amount,
      coinId: hexCoinId,
      memo,
    });
    try { await refreshBalance(); } catch (_) {}
    const record: TransferRecord = {
      id: generateId(),
      type: 'sent',
      amount,
      coinId,
      symbol: coinId,
      counterpart: recipient,
      timestamp: Date.now(),
      status: result?.status ?? 'completed',
      txId: result?.transferId ?? result?.id,
    };
    setTransfers(prev => [record, ...prev]);
    return { status: result?.status ?? 'completed', txId: record.txId };
  }, [refreshBalance, assets]);

  const mintTokens = useCallback(async (coinId: string, amount: bigint) => {
    if (!sphereRef.current) throw new Error('Wallet not connected');
    try {
      let hexId = KNOWN_COIN_IDS[coinId.toUpperCase()] ?? coinId;

      const result: any = await sphereRef.current.intent('mint', {
        coinId: hexId,
        amount: amount.toString(),
      });
      if (result?.success !== false) {
        await refreshBalance();
        const record: TransferRecord = {
          id: generateId(),
          type: 'mint',
          amount: amount.toString(),
          coinId,
          symbol: coinId,
          timestamp: Date.now(),
          status: 'confirmed',
          txId: result?.tokenId ?? result?.id,
        };
        setTransfers(prev => [record, ...prev]);
        return { success: true, tokenId: result?.tokenId ?? result?.id };
      } else {
        return { success: false, error: result?.error ?? 'Mint failed' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Mint failed' };
    }
  }, [refreshBalance]);

  const registerNametag = useCallback(async (_name: string) => {
    // Not supported over the Sphere Connect protocol — nametag registration
    // must be done inside the wallet app itself, not from a connected dApp.
    return { success: false, error: 'Register a nametag directly in your Sphere wallet — not available from a connected dApp.' };
  }, []);

 const schedulePayment = useCallback(async (to: string, amount: string, coinId: string, due_at: number) => {
  await fetch('/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, amount, coinId, rule: { type: 'once', due_at } }),
  });
  const payment: ScheduledPayment = {
    id: generateId(), to, amount, coinId, due_at, status: 'pending', created_at: Date.now(),
  };
  setScheduledPayments(prev => [...prev, payment]);
}, []);

  // Execute a scheduled payment — defined with useCallback and stored in ref for stability
  const executeScheduledPayment = useCallback(async (payment: ScheduledPayment) => {
    addAstridLog({ type: 'info', message: `Astrid woke up for payment ${payment.id.slice(0, 8)}…`, paymentId: payment.id });
    addAstridLog({ type: 'budget_check', message: `Checking budget: need ${payment.amount} ${payment.coinId}`, paymentId: payment.id });

    if (!sphereRef.current) {
      addAstridLog({ type: 'error', message: 'Wallet not connected — execution aborted', paymentId: payment.id });
      setScheduledPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'failed' } : p));
      return;
    }

    try {
      let sufficient = true;
      try {
        const assetList: any = await sphereRef.current.query('sphere_getAssets');
       const asset = (assetList ?? []).find((a: any) =>
          a.symbol?.toUpperCase() === payment.coinId?.toUpperCase() || a.coinId === payment.coinId
        );
        const balance = asset ? BigInt(asset.totalAmount?.toString() ?? '0') : 0n;
        const needed = BigInt(payment.amount);
        sufficient = balance >= needed;
        if (!sufficient) {
          addAstridLog({ type: 'error', message: `Insufficient balance: have ${balance}, need ${needed}`, paymentId: payment.id });
        } else {
          addAstridLog({ type: 'budget_check', message: `Balance OK: ${balance} ${payment.coinId} available`, paymentId: payment.id });
        }
      } catch (_) {
        addAstridLog({ type: 'budget_check', message: 'Could not verify balance, proceeding anyway…', paymentId: payment.id });
      }

      if (!sufficient) {
        setScheduledPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'failed' } : p));
        return;
      }

      addAstridLog({ type: 'approval', message: `Policy OK. Authorizing autonomous payment to ${payment.to}`, paymentId: payment.id });
      addAstridLog({ type: 'sent', message: `Calling sphere Connect intent 'send' → ${payment.to} ${payment.amount} ${payment.coinId}`, paymentId: payment.id });

     const scheduledAsset: any = (await sphereRef.current.query('sphere_getAssets').catch(() => [])).find(
  (a: any) => a.symbol?.toUpperCase() === payment.coinId?.toUpperCase() || a.coinId === payment.coinId
);
const hexCoinId = scheduledAsset?.coinId ?? KNOWN_COIN_IDS[payment.coinId?.toUpperCase()] ?? payment.coinId;
      const result: any = await sphereRef.current.intent('send', {
        to: payment.to,
        recipient: payment.to,
        amount: payment.amount,
        coinId: hexCoinId,
      });

      const txId = result?.transferId ?? result?.id ?? generateId();
      const smtLink = `https://unicitynetwork.github.io/smt-explorer/?tx=${txId}`;

      addAstridLog({ type: 'confirmed', message: `✓ Payment confirmed! status=${result?.status ?? 'completed'}`, txId, smtLink, paymentId: payment.id });
      setScheduledPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'executed' } : p));

      const record: TransferRecord = {
        id: generateId(),
        type: 'sent',
        amount: payment.amount,
        coinId: payment.coinId,
        counterpart: payment.to,
        timestamp: Date.now(),
        status: result?.status ?? 'completed',
        txId,
      };
      setTransfers(prev => [record, ...prev]);
      try { await refreshBalance(); } catch (_) {}

    } catch (err: any) {
      addAstridLog({ type: 'error', message: `Execution failed: ${err?.message ?? 'Unknown error'}`, paymentId: payment.id });
      setScheduledPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'failed' } : p));
    }
  }, [addAstridLog, refreshBalance]);

  // Keep ref updated
  executeRef.current = executeScheduledPayment;
  React.useEffect(() => {
    connectWallet(true).catch(() => setStatus('disconnected'));
  }, []);

  const cancelScheduled = useCallback((id: string) => {
    setScheduledPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' } : p));
  }, []);

  const clearMnemonic = useCallback(() => {
    setGeneratedMnemonic(null);
  }, []);

  return (
    <WalletContext.Provider value={{
      sphere, status, error, nametag, directAddress, generatedMnemonic,
      assets, transfers, scheduledPayments, astridLog,
      connectWallet, disconnectWallet, refreshBalance, refreshHistory,
      sendPayment, mintTokens, registerNametag, schedulePayment,
      cancelScheduled, addAstridLog, clearMnemonic,
    }}>
      {children}
    </WalletContext.Provider>
  );
};