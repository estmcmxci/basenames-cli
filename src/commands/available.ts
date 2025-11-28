/**
 * Available Command
 * 
 * Check if a basename is available for registration.
 * Uses direct contract call for real-time accuracy.
 */

import colors from "yoctocolors";
import { formatEther } from "viem";
import {
  startSpinner,
  stopSpinner,
  normalizeBasename,
  checkAvailable,
  getRegisterPrice,
  getNetworkConfig,
  type AvailableOptions,
} from "../utils";

// Duration constants
const ONE_YEAR_SECONDS = BigInt(365 * 24 * 60 * 60);

/**
 * Check if basename is available
 */
export async function available(options: AvailableOptions) {
  startSpinner("Checking availability...");

  const { name, showPrice } = options;
  const config = getNetworkConfig(options.network);

  try {
    const { label, fullName } = normalizeBasename(name, options.network);

    // Check availability (real-time on-chain)
    const isAvailable = await checkAvailable(label, options.network);

    stopSpinner();

    if (isAvailable) {
      console.log(colors.green(`✓ ${fullName} is available`));

      // Optionally show price
      if (showPrice !== false) {
        startSpinner("Getting price...");
        const price = await getRegisterPrice(label, ONE_YEAR_SECONDS, options.network);
        stopSpinner();
        console.log(colors.blue(`  Price: ${formatEther(price)} ETH (1 year)`));
      }
    } else {
      console.log(colors.red(`✗ ${fullName} is taken`));
    }
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error checking availability: ${e.message}`));
  }
}

