// Type declarations for @unicitylabs/sphere-sdk v0.7.2

declare module '@unicitylabs/sphere-sdk/impl/browser' {
  export function createBrowserProviders(config: {
    network: 'testnet' | 'mainnet' | 'dev';
    oracle?: { apiKey?: string; url?: string };
    transport?: { relays?: string[]; additionalRelays?: string[] };
    storage?: { prefix?: string };
    tokenSync?: { ipfs?: { enabled: boolean; additionalGateways?: string[] } };
  }): {
    storage: any;
    transport: any;
    oracle: any;
    tokenStorage?: any;
  };
}

declare module '@unicitylabs/sphere-sdk' {
  export interface SphereInitOptions {
    storage: any;
    transport: any;
    oracle: any;
    tokenStorage?: any;
    mnemonic?: string;
    autoGenerate?: boolean;
    nametag?: string;
    network?: 'testnet' | 'mainnet' | 'dev';
    l1?: any | null;
    price?: any;
    groupChat?: any | boolean;
    market?: any | boolean;
    accounting?: any | boolean;
    swap?: any | boolean;
  }

  export interface SphereInitResult {
    sphere: Sphere;
    created: boolean;
    generatedMnemonic?: string;
  }

  export interface Asset {
    coinId: string;
    symbol: string;
    totalAmount: bigint;
    decimals?: number;
    priceUsd?: number | null;
    fiatValueUsd?: number | null;
  }

  export interface TransferResult {
    status: 'completed' | 'pending' | 'submitted' | 'confirmed' | 'delivered' | 'failed';
    deliveryPending?: boolean;
    deliveryState?: 'landed' | 'pending-delivery';
    transferId?: string;
    id?: string;
  }

  export interface MintResult {
    success: boolean;
    tokenId?: string;
    error?: string;
    id?: string;
  }

  export class Sphere {
    static init(options: SphereInitOptions): Promise<SphereInitResult>;
    static exists(storage?: any): Promise<boolean>;
    static generateMnemonic(): string;
    static getInstance(): Sphere | null;
    static create(options: any): Promise<SphereInitResult>;
    static load(options: any): Promise<SphereInitResult>;

    payments: {
      getAssets(): Promise<Asset[]>;
      getBalance(): Promise<Asset[]>;
      getFiatBalance(): Promise<number | null>;
      send(params: {
        recipient: string;
        amount: string;
        coinId: string;
        memo?: string;
      }): Promise<TransferResult>;
      receive(filter?: any, callback?: any): Promise<{ transfers: any[] }>;
      mintFungibleToken(coinId: string, amount: bigint): Promise<MintResult>;
      sync(): Promise<void>;
      sendPaymentRequest(to: string, params: any): Promise<any>;
      onPaymentRequest(cb: (req: any) => void): void;
    };

    identity?: {
      chainPubkey: string;
      directAddress?: string;
      address?: string;
      nametag?: string;
      ipnsName?: string;
    };

    on(event: string, handler: (event: any) => void): void;
    off(event: string, handler: (event: any) => void): void;
    destroy(): void;
    registerNametag(name: string): Promise<void>;
    isNametagAvailable(name: string): Promise<boolean>;
    getNametagForAddress(index: number): string | undefined;
    getAllAddressNametags(): Map<number, string>;
    switchToAddress(index: number): Promise<void>;
    deriveAddress(index: number): { address: string; publicKey: string };
    getCurrentAddressIndex(): number;
    getTransport(): any;
    addTokenStorageProvider(provider: any): Promise<void>;
    removeTokenStorageProvider(id: string): Promise<void>;
    hasTokenStorageProvider(id: string): boolean;
    getTokenStorageProviders(): Map<string, any>;
    setPriceProvider(provider: any): void;
    signMessage(message: string): string;
  }

  export function getCoinIdBySymbol(symbol: string): string | undefined;
  export function createPriceProvider(config: any): any;
  export function addressesMatch(a: string, b: string): boolean;

  // Re-exports
  export const COIN_TYPES: any;
  export const DEFAULT_AGGREGATOR_URL: string;
  export const DEFAULT_NOSTR_RELAYS: readonly string[];
  export class CoinGeckoPriceProvider { constructor(config?: any): void; }
}
declare module '@unicitylabs/sphere-sdk/connect' {
  export function connect(options?: any): Promise<any>;
}