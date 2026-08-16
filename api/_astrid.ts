import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

let cachedSphere: any = null;

const KNOWN_COIN_IDS: Record<string, string> = {
  UCT: 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0',
};
export function resolveCoinId(coinId: string): string {
  return KNOWN_COIN_IDS[coinId?.toUpperCase()] ?? coinId;
}

export async function getAstridWallet() {
  if (cachedSphere) return cachedSphere;
  const base = createNodeProviders({
  network: 'testnet2',
 oracle: { apiKey: process.env.VITE_ORACLE_API_KEY },
  dataDir: '/tmp/sphere-data',
});
  const providers = createWalletApiProviders(base, {
    baseUrl: 'https://wallet-api.unicity.network',
    network: 'testnet2',
    deviceId: 'astrid-server',
  });
  const { sphere } = await Sphere.init({
  ...providers,
  network: 'testnet2',
  mnemonic: process.env.ASTRID_MNEMONIC,
});
 console.log('[Astrid Debug] trustBase:', !!sphere.getAggregator().getTrustBaseJson?.(), 'url:', sphere.getAggregator().getAggregatorUrl?.(), 'apiKey:', !!sphere.getAggregator().getApiKey?.());

  try {
    await sphere.payments.receive();
  } catch (e) {
    console.error('[Astrid] receive() failed:', e);
  }

  cachedSphere = sphere;
  return sphere;
}
