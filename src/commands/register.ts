/**
 * Register Command
 * 
 * Register a new basename with optional records.
 */

import colors from "yoctocolors";
import { isAddress, formatEther } from "viem";
import {
  startSpinner,
  stopSpinner,
  normalizeBasename,
  checkAvailable,
  getRegisterPrice,
  registerBasename,
  buildResolverData,
  getSignerAddress,
  getPublicClient,
  getNetworkConfig,
  type RegisterOptions,
} from "../utils";

// Duration parsing
function parseDuration(duration: string): bigint {
  const match = duration.match(/^(\d+)(y|m|d)?$/i);
  if (!match) {
    throw new Error("Invalid duration format. Use: 1y, 6m, 30d, or seconds");
  }

  const value = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();

  switch (unit) {
    case "y":
      return BigInt(value * 365 * 24 * 60 * 60);
    case "m":
      return BigInt(value * 30 * 24 * 60 * 60);
    case "d":
      return BigInt(value * 24 * 60 * 60);
    default:
      return BigInt(value);
  }
}

// Parse text records from CLI format: "key=value"
function parseTextRecords(txtArgs: string[]): Record<string, string> {
  const records: Record<string, string> = {};
  for (const txt of txtArgs) {
    const [key, ...valueParts] = txt.split("=");
    if (key && valueParts.length > 0) {
      records[key.trim()] = valueParts.join("=").trim();
    }
  }
  return records;
}

/**
 * Register a new basename
 */
export async function register(options: RegisterOptions) {
  const { name, owner, address, duration, txt, primary } = options;
  const config = getNetworkConfig(options.network);

  // Validate signer
  const signerAddress = getSignerAddress();
  if (!signerAddress) {
    console.error(colors.red("Error: BASENAMES_PRIVATE_KEY not set"));
    console.error(colors.yellow("Set the environment variable to register names"));
    return;
  }

  // Use signer address as owner if not provided
  const ownerAddress = owner || signerAddress;

  // Validate owner address
  if (!isAddress(ownerAddress)) {
    console.error(colors.red("Invalid owner address"));
    return;
  }

  // Validate address if provided
  const addressToSet = address || ownerAddress;
  if (!isAddress(addressToSet)) {
    console.error(colors.red("Invalid address"));
    return;
  }

  try {
    const { label, fullName, node } = normalizeBasename(name, options.network);

    // Parse duration
    const durationSeconds = parseDuration(duration || "1y");
    const durationYears = Number(durationSeconds) / (365 * 24 * 60 * 60);

    console.log(colors.blue("\nBasename Registration"));
    console.log(colors.blue("=====================\n"));
    console.log(`${colors.blue("Name:")}      ${fullName}`);
    console.log(`${colors.blue("Owner:")}     ${ownerAddress}`);
    console.log(`${colors.blue("Address:")}   ${addressToSet}`);
    console.log(`${colors.blue("Duration:")}  ${durationYears.toFixed(1)} year(s)`);
    console.log(`${colors.blue("Primary:")}   ${primary ? "Yes" : "No"}`);

    // Check availability
    startSpinner("Checking availability...");
    const isAvailable = await checkAvailable(label, options.network);

    if (!isAvailable) {
      stopSpinner();
      console.error(colors.red(`\n✗ ${fullName} is not available`));
      return;
    }
    stopSpinner();
    console.log(colors.green("✓ Name is available"));

    // Get price
    startSpinner("Getting price...");
    const price = await getRegisterPrice(label, durationSeconds, options.network);
    stopSpinner();
    console.log(`${colors.blue("Price:")}     ${formatEther(price)} ETH`);

    // Parse text records
    const textRecords = txt ? parseTextRecords(txt) : {};
    if (Object.keys(textRecords).length > 0) {
      console.log(colors.blue("\nText Records:"));
      for (const [key, value] of Object.entries(textRecords)) {
        console.log(`  ${key}: ${value}`);
      }
    }

    // Build resolver data
    // Note: The Basenames controller may not support resolver data in the same tx
    // We'll register first, then set records separately if needed
    const resolverData: `0x${string}`[] = [];

    // Register
    console.log(colors.blue("\nRegistering..."));
    startSpinner("Sending transaction...");

    const txHash = await registerBasename(
      label,
      ownerAddress as `0x${string}`,
      durationSeconds,
      resolverData,
      primary || false,
      options.network
    );

    stopSpinner();
    console.log(colors.green(`✓ Transaction sent: ${txHash}`));

    // Wait for confirmation
    startSpinner("Waiting for confirmation...");
    const client = getPublicClient(options.network);
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 2,
    });

    stopSpinner();

    if (receipt.status === "success") {
      console.log(colors.green(`✓ Confirmed in block ${receipt.blockNumber}`));
      console.log(colors.green(`\n🎉 Successfully registered ${fullName}!\n`));
      console.log(`${colors.blue("Explorer:")} ${config.explorerUrl}/tx/${txHash}`);

      // Note: Additional record setting would go here
      if (Object.keys(textRecords).length > 0 || addressToSet !== ownerAddress) {
        console.log(colors.yellow("\nNote: Additional records may need to be set separately."));
        console.log(colors.yellow("Use 'basenames edit' commands to set text and address records."));
      }
    } else {
      console.error(colors.red("✗ Transaction reverted"));
    }
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error registering: ${e.message}`));
  }
}

