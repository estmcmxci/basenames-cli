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
 * Extract the label(s) from a full basename
 * e.g., "vitalik.basetest.eth" -> "vitalik"
 * e.g., "owned.estmcmxci.basetest.eth" -> "owned.estmcmxci"
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

  // Return the full label path (supports subnames)
  return name;
}

/**
 * Check if a name is a subname (has multiple labels before the parent domain)
 * e.g., "owned.estmcmxci.basetest.eth" -> true
 * e.g., "vitalik.basetest.eth" -> false
 */
export function isSubname(input: string, network?: string): boolean {
  const label = extractLabel(input, network);
  return label.includes(".");
}

/**
 * Get the full basename from a label or label path
 * e.g., "vitalik" -> "vitalik.basetest.eth"
 * e.g., "owned.estmcmxci" -> "owned.estmcmxci.basetest.eth"
 */
export function getFullBasename(labelPath: string, network?: string): string {
  const config = getNetworkConfig(network);
  // Normalize each label in the path separately
  const parts = labelPath.split(".");
  const normalizedParts = parts.map((part) => normalize(part));
  return `${normalizedParts.join(".")}.${config.parentDomain}`;
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
 *
 * For top-level basenames (e.g., "vitalik.basetest.eth"), uses Basenames algorithm.
 * For subnames (e.g., "owned.estmcmxci.basetest.eth"), uses standard ENS namehash.
 */
export function normalizeBasename(input: string, network?: string): {
  label: string;
  fullName: string;
  node: `0x${string}`;
} {
  const labelPath = extractLabel(input, network);
  const fullName = getFullBasename(labelPath, network);

  // For subnames, use standard ENS namehash
  // For top-level basenames, use the Basenames algorithm
  let node: `0x${string}`;
  if (isSubname(input, network)) {
    node = namehash(fullName) as `0x${string}`;
  } else {
    const normalizedLabel = normalize(labelPath);
    node = calculateBasenameNode(normalizedLabel, network);
  }

  return { label: labelPath, fullName, node };
}


