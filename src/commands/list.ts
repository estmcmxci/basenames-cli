/**
 * List Command
 * 
 * List all basenames owned by an address.
 * Requires ENSNode for indexed data (not possible with on-chain calls alone).
 */

import colors from "yoctocolors";
import { isAddress } from "viem";
import {
  startSpinner,
  stopSpinner,
  getDomainsForAddress,
  getNetworkConfig,
  type ListOptions,
} from "../utils";

/**
 * List basenames owned by an address
 */
export async function list(options: ListOptions) {
  startSpinner("Fetching names...");

  const { address } = options;
  const config = getNetworkConfig(options.network);

  if (!isAddress(address)) {
    stopSpinner();
    console.error(colors.red("Invalid address format"));
    return;
  }

  try {
    // Use ENSNode for indexed query
    const domains = await getDomainsForAddress(address);

    stopSpinner();

    if (domains.length === 0) {
      console.log(colors.yellow(`No basenames found for ${address}`));
      console.log(colors.gray("\nNote: The list command uses ENSNode indexed data."));
      console.log(colors.gray("Names not yet indexed by ENSNode will not appear."));
      console.log(colors.gray("You can still query individual names with: basenames profile <name>"));
      return;
    }

    // Filter to only show basenames from our parent domain
    const basenames = domains.filter((d) =>
      d.name?.endsWith(`.${config.parentDomain}`)
    );

    if (basenames.length === 0) {
      console.log(colors.yellow(`No basenames found for ${address}`));
      console.log(colors.gray("\nNote: The list command uses ENSNode indexed data."));
      console.log(colors.gray("Names not yet indexed by ENSNode will not appear."));
      console.log(colors.gray("You can still query individual names with: basenames profile <name>"));
      return;
    }

    console.log(colors.blue(`\nBasenames owned by ${address}`));
    console.log(colors.blue("=".repeat(50) + "\n"));

    for (const domain of basenames) {
      let line = colors.white(domain.name || "Unknown");

      // Add expiry info
      if (domain.expiryDate) {
        const expiryDate = new Date(Number(domain.expiryDate) * 1000);
        const isExpired = expiryDate < new Date();
        const daysLeft = Math.floor(
          (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (isExpired) {
          line += colors.red("  (EXPIRED)");
        } else if (daysLeft < 30) {
          line += colors.yellow(`  (expires in ${daysLeft} days)`);
        } else {
          line += colors.gray(`  (expires ${expiryDate.toLocaleDateString()})`);
        }
      }

      console.log(`  ${line}`);
    }

    console.log(colors.blue(`\nTotal: ${basenames.length} basename(s)\n`));
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    
    if (e.message.includes("ENSNode")) {
      console.error(colors.red("ENSNode is required for listing names."));
      console.error(colors.yellow("The list command uses indexed data from ENSNode."));
    } else {
      console.error(colors.red(`Error listing names: ${e.message}`));
    }
  }
}

