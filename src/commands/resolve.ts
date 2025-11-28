/**
 * Resolve Command
 * 
 * Resolve a basename to an address or vice versa.
 * Uses ENSNode for fast indexed queries with on-chain fallback.
 */

import colors from "yoctocolors";
import { isAddress } from "viem";
import {
  startSpinner,
  stopSpinner,
  normalizeBasename,
  getResolver,
  getAddressRecord,
  getTextRecord,
  getPrimaryNameOnChain,
  getDomainByName,
  getNetworkConfig,
  type ResolveOptions,
} from "../utils";

/**
 * Resolve basename to address or address to basename
 */
export async function resolve(options: ResolveOptions) {
  startSpinner("Resolving...");

  const { input, txt, contenthash, resolverAddress, network } = options;
  const config = getNetworkConfig(network);

  try {
    // Determine if input is an address or name
    const isInputAddress = isAddress(input);

    if (isInputAddress) {
      // Reverse resolution: address → name (must use on-chain)
      const primaryName = await getPrimaryNameOnChain(input as `0x${string}`);
      stopSpinner();

      if (primaryName) {
        console.log(primaryName);
      } else {
        console.log(colors.yellow("No primary name set for this address"));
      }
      return;
    }

    // Forward resolution: name → address
    const { label, fullName, node } = normalizeBasename(input, network);

    // Try ENSNode first for faster lookup
    let ensNodeData = null;
    let address: `0x${string}` | null = null;
    let resolver: `0x${string}` | null = null;

    try {
      ensNodeData = await getDomainByName(fullName, network);
      if (ensNodeData?.owner?.id) {
        // ENSNode has the data
        resolver = ensNodeData.resolver?.address as `0x${string}` || null;
      }
    } catch (error) {
      // ENSNode not available, will fall back to on-chain
      const e = error as Error;
      // Silently continue - this is expected for non-indexed names
    }

    // Get resolver (from ENSNode or on-chain)
    if (!resolver) {
      try {
        resolver = resolverAddress
          ? (resolverAddress as `0x${string}`)
          : await getResolver(node, network);
      } catch (error) {
        stopSpinner();
        const e = error as Error;
        console.error(colors.red(`Error fetching resolver: ${e.message}`));
        console.error(colors.yellow(`This might be a network/RPC issue. Try again or check your connection.`));
        return;
      }
    }

    if (!resolver || resolver === "0x0000000000000000000000000000000000000000") {
      stopSpinner();
      console.log(colors.yellow(`No resolver found for ${fullName}`));
      console.log(colors.gray(`This name may not be registered or may not have a resolver set.`));
      console.log(colors.gray(`Node: ${node}`));
      console.log(colors.gray(`Network: ${network || "baseSepolia (default)"}`));
      return;
    }

    // Handle TXT record query (always on-chain for accuracy)
    if (txt) {
      const value = await getTextRecord(resolver, node, txt, network);
      stopSpinner();

      if (value) {
        console.log(value);
      } else {
        console.log(colors.yellow(`No value for text record: ${txt}`));
      }
      return;
    }

    // Handle contenthash query
    if (contenthash) {
      stopSpinner();
      console.log(colors.yellow("Content hash query not yet implemented for Basenames"));
      return;
    }

    // Default: get address record (on-chain for accuracy)
    address = await getAddressRecord(resolver, node, network);
    stopSpinner();

    if (address) {
      console.log(address);
    } else {
      console.log(colors.yellow(`No address record for ${fullName}`));
    }
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error resolving: ${e.message}`));
  }
}
