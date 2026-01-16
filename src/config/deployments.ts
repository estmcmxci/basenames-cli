/**
 * Basenames Contract Deployments
 * 
 * Contract addresses for Basenames on Base Sepolia and Base Mainnet
 */

export type NetworkConfig = {
  chainId: number;
  parentDomain: string;
  registry: `0x${string}`;
  resolver: `0x${string}`;
  registrarController: `0x${string}`;
  baseRegistrar: `0x${string}`;
  reverseRegistrar: `0x${string}`;
  ensNodeSubgraph: string;
  rpcUrl: string;
  explorerUrl: string;
  // Optional extended contracts
  priceOracle?: `0x${string}`;
  launchPriceOracle?: `0x${string}`;
  migrationController?: `0x${string}`;
  upgradeableRegistrarController?: `0x${string}`;
  upgradeableL2Resolver?: `0x${string}`;
  proxyAdmin?: `0x${string}`;
};

export const BASENAMES_DEPLOYMENTS: Record<string, NetworkConfig> = {
  baseSepolia: {
    chainId: 84532,
    parentDomain: "basetest.eth",
    registry: "0x1493b2567056c2181630115660963E13A8E32735",
    resolver: "0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA", // L2Resolver
    registrarController: "0x49aE3cC2e3AA768B1e5654f5D3C6002144A59581",
    baseRegistrar: "0xa0c70ec36c010b55e3c434d6c6ebeec50c705794",
    reverseRegistrar: "0x876eF94ce0773052a2f81921E70FF25a5e76841f",
    ensNodeSubgraph: "https://api.alpha-sepolia.ensnode.io/subgraph",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    // Extended contracts
    priceOracle: "0x2b73408052825e17e0fe464f92de85e8c7723231",
    launchPriceOracle: "0x2afF926546f5fbe3E10315CC9C0827AF1A167aC8",
    migrationController: "0xE8A87034a06425476F2bD6fD14EA038332Cc5e10",
    upgradeableRegistrarController: "0x82c858CDF64b3D893Fe54962680edFDDC37e94C8", // Proxy
    upgradeableL2Resolver: "0x85C87e548091f204C2d0350b39ce1874f02197c6", // Proxy
    proxyAdmin: "0xE6F8309b75E73ace9d2b73531880126D883ae904",
  },
  base: {
    chainId: 8453,
    parentDomain: "base.eth",
    registry: "0xb94704422c2a1e396835a571837aa5ae53285a95",
    resolver: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD", // L2Resolver
    registrarController: "0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5",
    baseRegistrar: "0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a",
    reverseRegistrar: "0x79ea96012eea67a83431f1701b3dff7e37f9e282",
    ensNodeSubgraph: "https://api.alpha.ensnode.io/subgraph",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    // Extended contracts
    priceOracle: "0x508CFE43aa84b8048cB6d39037cE0dc96d8aDc75",
    launchPriceOracle: "0xd53b558e1f07289acedf028d226974abba258312",
    migrationController: "0x8d5ef54f900c82da119B4a7F960A92F3Fa8daB43",
    upgradeableRegistrarController: "0xa7d2607c6BD39Ae9521e514026CBB078405Ab322", // Proxy
    upgradeableL2Resolver: "0x426fA03fB86E510d0Dd9F70335Cf102a98b10875", // Proxy
    proxyAdmin: "0x6c8E23DaCCc002d2Bca7608EC0351E434E74d5a8",
  },
};

// Default to Base Sepolia
export const DEFAULT_NETWORK = "baseSepolia";

// Coin types for Base networks (ENSIP-19)
// These are derived from chainId using the formula: 0x80000000 | chainId
export const BASE_MAINNET_COIN_TYPE = 2147492101n; // 0x80000000 | 8453
export const BASE_SEPOLIA_COIN_TYPE = 2147568180n; // 0x80000000 | 84532

export function getNetworkConfig(network?: string): NetworkConfig {
  const net = network || process.env.BASENAMES_NETWORK || DEFAULT_NETWORK;
  const config = BASENAMES_DEPLOYMENTS[net];
  if (!config) {
    throw new Error(`Unknown network: ${net}. Available: ${Object.keys(BASENAMES_DEPLOYMENTS).join(", ")}`);
  }
  return config;
}

/**
 * Get the coin type for a network (ENSIP-19)
 * Base networks use chain-specific coin types for L2 resolution
 */
export function getCoinType(network?: string): bigint {
  const config = getNetworkConfig(network);
  if (config.chainId === 8453) {
    return BASE_MAINNET_COIN_TYPE;
  } else if (config.chainId === 84532) {
    return BASE_SEPOLIA_COIN_TYPE;
  }
  // Default to 60 for ETH (coin type for Ethereum mainnet)
  return 60n;
}

