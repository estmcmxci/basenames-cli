/**
 * Profile Command
 * 
 * Display a complete profile for a basename with all records.
 * Uses ENSNode for fast indexed queries with on-chain fallback.
 */

import colors from "yoctocolors";
import { isAddress } from "viem";
import {
  startSpinner,
  stopSpinner,
  normalizeBasename,
  getResolver,
  getOwner,
  getAddressRecord,
  getTextRecord,
  getPrimaryNameOnChain,
  getDomainByName,
  getNetworkConfig,
  type ProfileOptions,
} from "../utils";

// Standard text record keys to query
const STANDARD_TEXT_KEYS = [
  "avatar",
  "description",
  "display",
  "email",
  "url",
  "com.github",
  "com.twitter",
  "com.discord",
  "com.warpcast",
  "org.telegram",
];

/**
 * Format text record key for display
 */
function formatKey(key: string): string {
  const mappings: Record<string, string> = {
    avatar: "Avatar",
    description: "Bio",
    display: "Display",
    email: "Email",
    url: "Website",
    "com.github": "GitHub",
    "com.twitter": "Twitter",
    "com.discord": "Discord",
    "com.warpcast": "Warpcast",
    "org.telegram": "Telegram",
  };
  return mappings[key] || key;
}

/**
 * Display basename profile
 */
export async function profile(options: ProfileOptions) {
  startSpinner("Fetching profile...");

  const { input, resolverAddress, network } = options;
  const config = getNetworkConfig(network);

  try {
    let fullName: string;
    let node: `0x${string}`;
    let addressToQuery: `0x${string}` | null = null;

    // If input is an address, try reverse resolution first
    if (isAddress(input)) {
      const primaryName = await getPrimaryNameOnChain(input as `0x${string}`, network);
      if (!primaryName) {
        stopSpinner();
        console.log(colors.yellow(`No primary name found for ${input}`));
        return;
      }
      addressToQuery = input as `0x${string}`;
      const normalized = normalizeBasename(primaryName, network);
      fullName = normalized.fullName;
      node = normalized.node;
    } else {
      const normalized = normalizeBasename(input, network);
      fullName = normalized.fullName;
      node = normalized.node;
    }

    // Try ENSNode first for fast indexed data
    let ensNodeData = null;
    let dataSource = "on-chain";
    try {
      ensNodeData = await getDomainByName(fullName, network);
      if (ensNodeData?.owner?.id) {
        dataSource = "ENSNode + on-chain";
      }
    } catch {
      // ENSNode not available, fall back to on-chain
    }

    // Get resolver (from ENSNode or on-chain)
    let resolver = resolverAddress
      ? (resolverAddress as `0x${string}`)
      : ensNodeData?.resolver?.address as `0x${string}` || null;
    
    if (!resolver) {
      resolver = await getResolver(node, network);
    }

    // Get owner (from ENSNode or on-chain)
    let owner = ensNodeData?.owner?.id as `0x${string}` || null;
    if (!owner) {
      owner = await getOwner(node, network);
    }

    if (!resolver) {
      stopSpinner();
      console.log(colors.yellow(`${fullName} is not registered or has no resolver`));
      return;
    }

    // Get address record (always on-chain for accuracy)
    const addressRecord = await getAddressRecord(resolver, node, network);
    
    // Get primary name (always on-chain for accuracy)
    const primaryName = addressRecord
      ? await getPrimaryNameOnChain(addressRecord, network)
      : null;

    // Get text records
    const textRecords: Record<string, string> = {};

    // Use ENSNode text keys if available, otherwise query standard keys
    const keysToQuery = ensNodeData?.resolver?.texts || STANDARD_TEXT_KEYS;

    for (const key of keysToQuery) {
      const value = await getTextRecord(resolver, node, key, network);
      if (value) {
        textRecords[key] = value;
      }
    }

    stopSpinner();

    // Print profile
    console.log(colors.blue("\nBasenames Profile"));
    console.log(colors.blue("=================\n"));

    console.log(`${colors.blue("Name:")}        ${fullName}`);
    if (addressRecord) {
      console.log(`${colors.blue("Address:")}     ${addressRecord}`);
    }
    if (owner) {
      console.log(`${colors.blue("Owner:")}       ${owner}`);
    }
    console.log(`${colors.blue("Resolver:")}    ${resolver}`);

    // Primary name status
    if (primaryName) {
      if (primaryName.toLowerCase() === fullName.toLowerCase()) {
        console.log(`${colors.blue("Primary:")}     ${colors.green("✓ Set")}`);
      } else {
        console.log(`${colors.blue("Primary:")}     ${colors.yellow(primaryName)} (different name)`);
      }
    } else if (addressRecord) {
      console.log(`${colors.blue("Primary:")}     ${colors.yellow("✗ Not set")}`);
    }

    // Expiry date from ENSNode
    if (ensNodeData?.expiryDate) {
      const expiryDate = new Date(Number(ensNodeData.expiryDate) * 1000);
      const isExpired = expiryDate < new Date();
      const dateStr = expiryDate.toLocaleDateString();
      console.log(
        `${colors.blue("Expires:")}     ${isExpired ? colors.red(dateStr + " (EXPIRED)") : dateStr}`
      );
    }

    // Text records
    if (Object.keys(textRecords).length > 0) {
      console.log(colors.blue("\nText Records:"));
      for (const [key, value] of Object.entries(textRecords)) {
        const displayKey = formatKey(key);
        const padding = " ".repeat(Math.max(1, 12 - displayKey.length));
        const displayValue = value.length > 50 ? value.slice(0, 47) + "..." : value;
        console.log(`${colors.blue(`${displayKey}:`)}${padding}${displayValue}`);
      }
    }

    // Explorer links
    console.log(colors.blue("\nLinks:"));
    console.log(`${colors.blue("Explorer:")}    ${config.explorerUrl}/address/${addressRecord || owner}`);
    
    // Show data source
    console.log(colors.gray(`\nData source: ${dataSource}`));
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error fetching profile: ${e.message}`));
  }
}
