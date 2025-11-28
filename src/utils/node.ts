/**
 * Basenames Node Calculation Utilities
 * 
 * Basenames uses a specific algorithm for calculating node hashes:
 * keccak256(abi.encodePacked(rootNode, keccak256(label)))
 * 
 * This is different from standard ENS namehash in how subnames are calculated.
 */

import { keccak256, encodePacked, toBytes, namehash } from "viem";
import { normalize } from "viem/ens";
import { getNetworkConfig } from "../config/deployments";

/**
 * Calculate the root node for a parent domain
 * e.g., "basetest.eth" -> namehash("basetest.eth")
 */
export function getParentNode(network?: string): `0x${string}` {
  const config = getNetworkConfig(network);
  return namehash(config.parentDomain) as `0x${string}`;
}

/**
 * Calculate the label hash for a single label
 * e.g., "vitalik" -> keccak256(toBytes("vitalik"))
 */
export function labelHash(label: string): `0x${string}` {
  const normalizedLabel = normalize(label);
  return keccak256(toBytes(normalizedLabel));
}

/**
 * Calculate the subname node hash using Basenames algorithm
 * 
 * This is the key difference from standard ENS:
 * Basenames: keccak256(abi.encodePacked(rootNode, keccak256(label)))
 * Standard ENS: keccak256(abi.encodePacked(parentNode, keccak256(label)))
 * 
 * For top-level basenames (e.g., "vitalik.basetest.eth"), these are the same.
 * The difference matters for nested subnames.
 */
export function calculateBasenameNode(label: string, network?: string): `0x${string}` {
  const parentNode = getParentNode(network);
  const normalizedLabel = normalize(label);
  const labelHashValue = keccak256(toBytes(normalizedLabel));
  return keccak256(encodePacked(["bytes32", "bytes32"], [parentNode, labelHashValue]));
}

/**
 * Extract the label from a full basename
 * e.g., "vitalik.basetest.eth" -> "vitalik"
 * e.g., "vitalik" -> "vitalik"
 */
export function extractLabel(fullName: string, network?: string): string {
  const config = getNetworkConfig(network);
  const parentSuffix = `.${config.parentDomain}`;
  
  // Remove parent domain suffix if present
  let name = fullName;
  if (name.toLowerCase().endsWith(parentSuffix.toLowerCase())) {
    name = name.slice(0, -parentSuffix.length);
  }
  
  // Get the first label (in case of subnames like "sub.vitalik")
  const parts = name.split(".");
  return parts[0];
}

/**
 * Get the full basename from a label
 * e.g., "vitalik" -> "vitalik.basetest.eth"
 */
export function getFullBasename(label: string, network?: string): string {
  const config = getNetworkConfig(network);
  const normalizedLabel = normalize(label);
  return `${normalizedLabel}.${config.parentDomain}`;
}

/**
 * Check if a string is likely a full basename (has parent domain)
 */
export function isFullBasename(name: string, network?: string): boolean {
  const config = getNetworkConfig(network);
  return name.toLowerCase().endsWith(`.${config.parentDomain.toLowerCase()}`);
}

/**
 * Normalize and validate a basename input
 * Returns the normalized label and full name
 */
export function normalizeBasename(input: string, network?: string): {
  label: string;
  fullName: string;
  node: `0x${string}`;
} {
  const label = extractLabel(input, network);
  const normalizedLabel = normalize(label);
  const fullName = getFullBasename(normalizedLabel, network);
  const node = calculateBasenameNode(normalizedLabel, network);
  
  return { label: normalizedLabel, fullName, node };
}

