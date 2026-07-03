import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

let cachedSphere: any = null;

export async function getAstridWallet() {
  if (cachedSphere) return cachedSphere;
  const base = createNodeProviders({
  network: 'testnet',
 oracle: { apiKey: process.env.VITE_ORACLE_API_KEY },
  dataDir: '/tmp/sphere-data',
  tokensDir: '/tmp/sphere-tokens',
});
  const providers = createWalletApiProviders(base, {
    baseUrl: 'https://wallet-api.unicity.network',
    network: 'testnet2',
    deviceId: 'astrid-server',
  });
  const { sphere } = await Sphere.init({
  ...providers,
  network: 'testnet',
  mnemonic: process.env.ASTRID_MNEMONIC,
});
  cachedSphere = sphere;
  return sphere;
}