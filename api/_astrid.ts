import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const KNOWN_COIN_IDS: Record<string, string> = {
  UCT: 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0',
  SOL: '72f7771d5690afcf89cfc16e8ee8c1a836d0faa8ed1b34d527aabc18acb949ae',
  BTC: '3cc412d8a24510d424f74de4c471d22298b7f52625af6fd3ecb3c3d9e1a683fb',
  ETH: '746a4e75aeb3221462f762fc41925735983c6039e89288bbb632a8fb1012e7d0',
  USDU: 'e210f98956f564bfe67ee94fddd386b5157f660d1957169b391f962093a2da2a',
};
export function resolveCoinId(coinId: string): string {
  return KNOWN_COIN_IDS[coinId?.toUpperCase()] ?? coinId;
}

let cachedSphere: any = null;

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
