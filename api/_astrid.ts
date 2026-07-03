import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

let cachedSphere: any = null;

export async function getAstridWallet() {
  if (cachedSphere) return cachedSphere;
  const base = createNodeProviders({
    network: 'testnet',
    oracle: { apiKey: 'sk_ddc3cfcc001e4a28ac3fad7407f99590' },
  });
  const providers = createWalletApiProviders(base, {
    baseUrl: 'https://wallet-api.unicity.network',
    network: 'testnet2',
    deviceId: 'astrid-server',
  });
  const { sphere } = await Sphere.init({
    ...providers,
    mnemonic: process.env.ASTRID_MNEMONIC,
    nametag: 'astrid',
  });
  cachedSphere = sphere;
  return sphere;
}