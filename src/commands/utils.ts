/**
 * Utility Commands
 * 
 * Namehash, labelhash, resolver lookup, and deployments display.
 * Uses ENSNode for faster lookups with on-chain fallback.
 */

import colors from "yoctocolors";
import { namehash } from "viem";
import {
  startSpinner,
  stopSpinner,
  normalizeBasename,
  labelHash,
  calculateBasenameNode,
  getResolver,
  getDomainByName,
  getNetworkConfig,
  BASENAMES_DEPLOYMENTS,
} from "../utils";

/**
 * Get namehash for an ENS name
 */
export async function getNamehash(options: { name: string; network?: string }) {
  const { name, network } = options;

  try {
    // If it's a full name (contains dots), use standard namehash
    if (name.includes(".")) {
      const hash = namehash(name);
      console.log(hash);
    } else {
      // If it's just a label, calculate basename node
      const { fullName, node } = normalizeBasename(name, network);
      console.log(colors.blue(`Basename node for ${fullName}:`));
      console.log(node);
    }
  } catch (error) {
    const e = error as Error;
    console.error(colors.red(`Error calculating namehash: ${e.message}`));
  }
}

/**
 * Get labelhash for a label
 */
export async function getLabelHash(options: { name: string }) {
  const { name } = options;

  try {
    // Extract first label if full name provided
    const label = name.split(".")[0];
    const hash = labelHash(label);
    console.log(hash);
  } catch (error) {
    const e = error as Error;
    console.error(colors.red(`Error calculating labelhash: ${e.message}`));
  }
}

/**
 * Get resolver address for a basename
 * Uses ENSNode for faster lookup with on-chain fallback
 */
export async function getResolverAddress(options: { name: string; network?: string }) {
  startSpinner("Fetching resolver...");

  const { name, network } = options;

  try {
    const { fullName, node } = normalizeBasename(name, network);
    let resolver: string | null = null;

    // Try ENSNode first for faster lookup
    try {
      const ensNodeData = await getDomainByName(fullName, network);
      if (ensNodeData?.resolver?.address) {
        resolver = ensNodeData.resolver.address;
        stopSpinner();
        console.log(resolver);
        console.log(colors.gray("  (from ENSNode)"));
        return;
      }
    } catch {
      // ENSNode not available, fall back to on-chain
    }

    // Fall back to on-chain query
    resolver = await getResolver(node, network);

    stopSpinner();

    if (resolver) {
      console.log(resolver);
    } else {
      console.log(colors.yellow(`No resolver found for ${fullName}`));
    }
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error getting resolver: ${e.message}`));
  }
}

/**
 * Display contract deployments
 */
export function getDeployments() {
  console.log(colors.blue("\nBasenames Contract Deployments"));
  console.log(colors.blue("==============================\n"));

  for (const [network, config] of Object.entries(BASENAMES_DEPLOYMENTS)) {
    console.log(colors.green(`${network.toUpperCase()} (Chain ID: ${config.chainId})`));
    console.log(colors.blue(`  Parent Domain: ${config.parentDomain}`));
    console.log(`  Registry:              ${config.registry}`);
    console.log(`  Resolver:              ${config.resolver}`);
    console.log(`  RegistrarController:   ${config.registrarController}`);
    console.log(`  BaseRegistrar:         ${config.baseRegistrar}`);
    console.log(`  ReverseRegistrar:      ${config.reverseRegistrar}`);
    
    // Show extended contracts if available
    if (config.priceOracle) {
      console.log(`  PriceOracle:           ${config.priceOracle}`);
    }
    if (config.launchPriceOracle) {
      console.log(`  LaunchPriceOracle:     ${config.launchPriceOracle}`);
    }
    if (config.migrationController) {
      console.log(`  MigrationController:   ${config.migrationController}`);
    }
    if (config.upgradeableRegistrarController) {
      console.log(`  UpgradeableController: ${config.upgradeableRegistrarController}`);
    }
    if (config.upgradeableL2Resolver) {
      console.log(`  UpgradeableResolver:   ${config.upgradeableL2Resolver}`);
    }
    if (config.proxyAdmin) {
      console.log(`  ProxyAdmin:            ${config.proxyAdmin}`);
    }
    
    console.log(colors.gray(`  ENSNode:               ${config.ensNodeSubgraph}`));
    console.log(colors.gray(`  RPC:                   ${config.rpcUrl}`));
    console.log(colors.gray(`  Explorer:              ${config.explorerUrl}`));
    console.log();
  }
}
