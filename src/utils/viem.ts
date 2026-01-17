/**
 * Viem Client Setup for Basenames CLI
 * 
 * Configures public and wallet clients for Base Sepolia
 * with ENSNode subgraph integration for indexed queries.
 */

import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from "viem";
import { baseSepolia, base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getNetworkConfig } from "../config/deployments";
import { getLedgerAccount, getLedgerAddress, closeLedger } from "./ledger";

// Chain mapping
const CHAINS = {
  baseSepolia,
  base,
} as const;

/**
 * Create a public client for read operations
 * Configured with ENSNode subgraph for indexed queries
 */
export function createBasenamesPublicClient(network?: string): PublicClient {
  const config = getNetworkConfig(network);
  const chain = config.chainId === 84532 ? baseSepolia : base;
  
  // Support network-specific RPC URLs, fallback to generic BASE_RPC_URL, then default
  const net = network || process.env.BASENAMES_NETWORK || "baseSepolia";
  const rpcUrl = 
    (net === "base" && process.env.BASE_RPC_URL_BASE) ||
    (net === "baseSepolia" && process.env.BASE_RPC_URL_BASESEPOLIA) ||
    process.env.BASE_RPC_URL ||
    config.rpcUrl;

  return createPublicClient({
    chain: {
      ...chain,
      // Add ENSNode subgraph for indexed queries
      subgraphs: { ens: { url: config.ensNodeSubgraph } },
    } as any,
    transport: http(rpcUrl),
  });
}

/**
 * Create a wallet client for write operations
 * Supports both private key (env var) and Ledger hardware wallet
 */
export async function createBasenamesWalletClient(
  network?: string,
  useLedger = false,
  accountIndex = 0
): Promise<WalletClient | null> {
  const config = getNetworkConfig(network);
  const chain = config.chainId === 84532 ? baseSepolia : base;

  // Support network-specific RPC URLs, fallback to generic BASE_RPC_URL, then default
  const net = network || process.env.BASENAMES_NETWORK || "baseSepolia";
  const rpcUrl =
    (net === "base" && process.env.BASE_RPC_URL_BASE) ||
    (net === "baseSepolia" && process.env.BASE_RPC_URL_BASESEPOLIA) ||
    process.env.BASE_RPC_URL ||
    config.rpcUrl;

  if (useLedger) {
    const account = await getLedgerAccount(accountIndex);
    return createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });
  }

  // Existing private key flow
  const privateKey = process.env.BASENAMES_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Get the signer address from the configured private key
 */
export function getSignerAddress(): `0x${string}` | null {
  const privateKey = process.env.BASENAMES_PRIVATE_KEY;
  if (!privateKey) return null;
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return account.address;
}

// Cache clients per network to avoid recreating them
const _publicClients: Map<string, PublicClient> = new Map();
const _walletClients: Map<string, WalletClient> = new Map();

export function getPublicClient(network?: string): PublicClient {
  const net = network || process.env.BASENAMES_NETWORK || "baseSepolia";
  
  if (!_publicClients.has(net)) {
    // Always pass the resolved network name, not the original parameter
    _publicClients.set(net, createBasenamesPublicClient(net));
  }
  return _publicClients.get(net)!;
}

export async function getWalletClient(
  network?: string,
  useLedger = false,
  accountIndex = 0
): Promise<WalletClient | null> {
  const net = network || process.env.BASENAMES_NETWORK || "baseSepolia";

  // For Ledger, always create fresh client (no caching)
  if (useLedger) {
    return await createBasenamesWalletClient(net, true, accountIndex);
  }

  // For private key, use cached client
  if (!_walletClients.has(net)) {
    // Always pass the resolved network name, not the original parameter
    const client = await createBasenamesWalletClient(net);
    if (client) {
      _walletClients.set(net, client);
    } else {
      return null;
    }
  }
  return _walletClients.get(net) || null;
}

/**
 * Get signer address (async version for Ledger support)
 */
export async function getSignerAddressAsync(
  useLedger = false,
  accountIndex = 0
): Promise<`0x${string}` | null> {
  if (useLedger) {
    return await getLedgerAddress(accountIndex);
  }
  return getSignerAddress();
}

// Re-export closeLedger for cleanup
export { closeLedger };

