/**
 * Contract ABIs and Direct Contract Call Utilities
 * 
 * For write operations and real-time reads, we use direct contract calls.
 * ENSNode is used for indexed read operations (profile, list, etc.)
 */

import type { Address } from "viem";
import { encodeFunctionData } from "viem";
import { normalize } from "viem/ens";
import { getNetworkConfig } from "../config/deployments";
import { getPublicClient, getWalletClient } from "./viem";
import { calculateBasenameNode } from "./node";

// ============================================================================
// ABI Definitions
// ============================================================================

export const REGISTRY_ABI = [
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
] as const;

export const RESOLVER_ABI = [
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "setAddr",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "multicall",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
] as const;

export const REGISTRAR_CONTROLLER_ABI = [
  {
    name: "available",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "registerPrice",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "owner", type: "address" },
          { name: "duration", type: "uint256" },
          { name: "resolver", type: "address" },
          { name: "data", type: "bytes[]" },
          { name: "reverseRecord", type: "bool" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export const REVERSE_REGISTRAR_ABI = [
  {
    name: "node",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    name: "setName",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    name: "setNameForAddr",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "addr", type: "address" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "name", type: "string" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Check if a basename is available for registration
 */
export async function checkAvailable(label: string, network?: string): Promise<boolean> {
  const config = getNetworkConfig(network);
  const client = getPublicClient(network);

  // Normalize the label name (ENS normalization)
  const normalizedName = normalize(label);

  try {
    const isAvailable = await client.readContract({
      address: config.registrarController,
      abi: REGISTRAR_CONTROLLER_ABI,
      functionName: "available",
      args: [normalizedName],
    });

    return isAvailable as boolean;
  } catch (error) {
    const e = error as Error;
    // Check if it's the "no data" error - this might mean the contract doesn't have the function
    // or the RPC is having issues. Let's try to provide more helpful debugging info.
    if (e.message.includes("returned no data")) {
      throw new Error(
        `Contract call failed: The "available" function on ${config.registrarController} returned no data. ` +
        `This might indicate: (1) RPC connection issue, (2) Contract address incorrect, or (3) Function signature mismatch. ` +
        `Network: ${network || "baseSepolia (default)"}, Label: "${label}", Normalized: "${normalizedName}"`
      );
    }
    // Re-throw with more context
    throw new Error(
      `Failed to check availability for "${label}" (normalized: "${normalizedName}") on ${config.registrarController}: ${e.message}`
    );
  }
}

/**
 * Get registration price for a basename
 */
export async function getRegisterPrice(
  label: string,
  durationSeconds: bigint,
  network?: string
): Promise<bigint> {
  const config = getNetworkConfig(network);
  const client = getPublicClient(network);

  // Normalize the label name (ENS normalization)
  const normalizedName = normalize(label);

  const price = await client.readContract({
    address: config.registrarController,
    abi: REGISTRAR_CONTROLLER_ABI,
    functionName: "registerPrice",
    args: [normalizedName, durationSeconds],
  });

  return price as bigint;
}

/**
 * Get resolver address for a basename
 */
export async function getResolver(node: `0x${string}`, network?: string): Promise<Address | null> {
  const config = getNetworkConfig(network);
  const client = getPublicClient(network);

  try {
    const resolver = await client.readContract({
      address: config.registry,
      abi: REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    });

    if (resolver === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    return resolver as Address;
  } catch (error) {
    // Log error for debugging but don't throw - let caller handle
    const e = error as Error;
    // Re-throw RPC/network errors so caller can provide better error message
    if (
      e.message.includes("timeout") ||
      e.message.includes("network") ||
      e.message.includes("ECONNREFUSED") ||
      e.message.includes("fetch failed")
    ) {
      throw new Error(`RPC error: ${e.message}. Check your network connection.`);
    }
    // For other errors, log and return null (name might not exist or contract call failed)
    console.error(`getResolver error for node ${node}: ${e.message}`);
    return null;
  }
}

/**
 * Get owner address for a basename
 */
export async function getOwner(node: `0x${string}`, network?: string): Promise<Address | null> {
  const config = getNetworkConfig(network);
  const client = getPublicClient(network);

  try {
    const owner = await client.readContract({
      address: config.registry,
      abi: REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    });

    if (owner === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    return owner as Address;
  } catch {
    return null;
  }
}

/**
 * Get address record from resolver
 */
export async function getAddressRecord(
  resolverAddress: Address,
  node: `0x${string}`,
  network?: string
): Promise<Address | null> {
  const client = getPublicClient(network);

  try {
    const addr = await client.readContract({
      address: resolverAddress,
      abi: RESOLVER_ABI,
      functionName: "addr",
      args: [node],
    });

    if (addr === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    return addr as Address;
  } catch {
    return null;
  }
}

/**
 * Get text record from resolver
 */
export async function getTextRecord(
  resolverAddress: Address,
  node: `0x${string}`,
  key: string,
  network?: string
): Promise<string | null> {
  const client = getPublicClient(network);

  try {
    const value = await client.readContract({
      address: resolverAddress,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [node, key],
    });

    return value || null;
  } catch {
    return null;
  }
}

/**
 * Get primary name (reverse resolution) for an address
 */
export async function getPrimaryNameOnChain(
  address: Address,
  network?: string
): Promise<string | null> {
  const config = getNetworkConfig(network);
  const client = getPublicClient(network);

  try {
    // Get reverse node for address
    const reverseNode = await client.readContract({
      address: config.reverseRegistrar,
      abi: REVERSE_REGISTRAR_ABI,
      functionName: "node",
      args: [address],
    });

    if (reverseNode === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return null;
    }

    // Get name from resolver
    const name = await client.readContract({
      address: config.resolver,
      abi: RESOLVER_ABI,
      functionName: "name",
      args: [reverseNode as `0x${string}`],
    });

    return name || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Register a new basename
 */
export async function registerBasename(
  label: string,
  owner: Address,
  durationSeconds: bigint,
  resolverData: `0x${string}`[],
  reverseRecord: boolean,
  network?: string
): Promise<`0x${string}`> {
  const config = getNetworkConfig(network);
  const client = getPublicClient(network);
  const wallet = await getWalletClient(network);

  if (!wallet) {
    throw new Error("Wallet not configured. Set BASENAMES_PRIVATE_KEY environment variable.");
  }

  // Normalize the label name (ENS normalization)
  const normalizedName = normalize(label);

  // Get registration price
  const price = await getRegisterPrice(normalizedName, durationSeconds, network);

  const request = {
    name: normalizedName,
    owner,
    duration: durationSeconds,
    resolver: config.resolver,
    data: resolverData,
    reverseRecord,
  };

  // Simulate transaction
  await client.simulateContract({
    account: wallet.account!,
    address: config.registrarController,
    abi: REGISTRAR_CONTROLLER_ABI,
    functionName: "register",
    args: [request],
    value: price,
  });

  // Execute transaction
  const txHash = await wallet.writeContract({
    address: config.registrarController,
    abi: REGISTRAR_CONTROLLER_ABI,
    functionName: "register",
    args: [request],
    value: price,
  });

  return txHash;
}

/**
 * Set a text record
 */
export async function setTextRecordOnChain(
  node: `0x${string}`,
  key: string,
  value: string,
  resolverAddress?: Address,
  network?: string
): Promise<`0x${string}`> {
  const config = getNetworkConfig(network);
  const wallet = await getWalletClient(network);

  if (!wallet) {
    throw new Error("Wallet not configured. Set BASENAMES_PRIVATE_KEY environment variable.");
  }

  const resolver = resolverAddress || config.resolver;

  const txHash = await wallet.writeContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: "setText",
    args: [node, key, value],
  });

  return txHash;
}

/**
 * Set address record
 */
export async function setAddressRecordOnChain(
  node: `0x${string}`,
  address: Address,
  resolverAddress?: Address,
  network?: string
): Promise<`0x${string}`> {
  const config = getNetworkConfig(network);
  const wallet = await getWalletClient(network);

  if (!wallet) {
    throw new Error("Wallet not configured. Set BASENAMES_PRIVATE_KEY environment variable.");
  }

  const resolver = resolverAddress || config.resolver;

  const txHash = await wallet.writeContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: "setAddr",
    args: [node, address],
  });

  return txHash;
}

/**
 * Set primary name (reverse record)
 * Uses setNameForAddr to set reverse record for the signer's address
 */
export async function setPrimaryNameOnChain(
  name: string,
  network?: string
): Promise<`0x${string}`> {
  const config = getNetworkConfig(network);
  const wallet = await getWalletClient(network);

  if (!wallet) {
    throw new Error("Wallet not configured. Set BASENAMES_PRIVATE_KEY environment variable.");
  }

  const signerAddress = wallet.account.address;

  // Use setNameForAddr which is more explicit and works better
  // setNameForAddr(addr, owner, resolver, name)
  // - addr: address to set reverse record for (signer's address)
  // - owner: owner of the reverse node (signer)
  // - resolver: resolver address
  // - name: the name to set
  const txHash = await wallet.writeContract({
    address: config.reverseRegistrar,
    abi: REVERSE_REGISTRAR_ABI,
    functionName: "setNameForAddr",
    args: [signerAddress, signerAddress, config.resolver, name],
  });

  return txHash;
}

/**
 * Build resolver data for setting records during registration
 */
export function buildResolverData(
  node: `0x${string}`,
  addressToSet?: Address,
  textRecords?: Record<string, string>
): `0x${string}`[] {
  const data: `0x${string}`[] = [];

  // Add setAddr call
  if (addressToSet) {
    data.push(
      encodeFunctionData({
        abi: RESOLVER_ABI,
        functionName: "setAddr",
        args: [node, addressToSet],
      })
    );
  }

  // Add setText calls
  if (textRecords) {
    for (const [key, value] of Object.entries(textRecords)) {
      data.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: "setText",
          args: [node, key, value],
        })
      );
    }
  }

  return data;
}

