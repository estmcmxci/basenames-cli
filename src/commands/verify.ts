/**
 * Verify Command
 * 
 * Verify that all expected records are correctly set for a basename.
 */

import colors from "yoctocolors";
import {
  startSpinner,
  stopSpinner,
  normalizeBasename,
  getResolver,
  getOwner,
  getAddressRecord,
  getTextRecord,
  getPrimaryNameOnChain,
  getNetworkConfig,
  type VerifyOptions,
} from "../utils";

// Default expected records
const DEFAULT_EXPECTED_RECORDS = [
  "avatar",
  "description",
];

/**
 * Verify basename records
 */
export async function verify(options: VerifyOptions) {
  startSpinner("Verifying records...");

  const { name, expectedRecords } = options;
  const config = getNetworkConfig(options.network);
  const recordsToCheck = expectedRecords || DEFAULT_EXPECTED_RECORDS;

  try {
    const { fullName, node } = normalizeBasename(name);

    console.log(colors.blue("\nBasename Verification"));
    console.log(colors.blue("=====================\n"));
    console.log(`${colors.blue("Name:")} ${fullName}`);
    console.log(`${colors.blue("Node:")} ${node}\n`);

    // Check owner
    const owner = await getOwner(node);
    if (owner) {
      console.log(colors.green(`✓ Owner: ${owner}`));
    } else {
      stopSpinner();
      console.log(colors.red(`✗ Name not registered (no owner)`));
      return;
    }

    // Check resolver
    const resolver = await getResolver(node);
    if (resolver) {
      console.log(colors.green(`✓ Resolver: ${resolver}`));
    } else {
      stopSpinner();
      console.log(colors.red(`✗ No resolver set`));
      return;
    }

    // Check address record
    const addressRecord = await getAddressRecord(resolver, node);
    if (addressRecord) {
      console.log(colors.green(`✓ Address: ${addressRecord}`));
    } else {
      console.log(colors.yellow(`○ Address: Not set`));
    }

    // Check primary name (reverse resolution)
    if (addressRecord) {
      const primaryName = await getPrimaryNameOnChain(addressRecord);
      if (primaryName) {
        if (primaryName.toLowerCase() === fullName.toLowerCase()) {
          console.log(colors.green(`✓ Primary Name: ${primaryName}`));
        } else {
          console.log(colors.yellow(`○ Primary Name: ${primaryName} (different name)`));
        }
      } else {
        console.log(colors.yellow(`○ Primary Name: Not set`));
      }
    }

    // Check text records
    console.log(colors.blue("\nText Records:"));
    const results: { key: string; status: "set" | "empty" | "error"; value?: string }[] = [];

    for (const key of recordsToCheck) {
      try {
        const value = await getTextRecord(resolver, node, key);
        if (value) {
          results.push({ key, status: "set", value });
          const displayValue = value.length > 40 ? value.slice(0, 37) + "..." : value;
          console.log(colors.green(`  ✓ ${key}: ${displayValue}`));
        } else {
          results.push({ key, status: "empty" });
          console.log(colors.yellow(`  ○ ${key}: (empty)`));
        }
      } catch {
        results.push({ key, status: "error" });
        console.log(colors.red(`  ✗ ${key}: (error)`));
      }
    }

    stopSpinner();

    // Summary
    const setCount = results.filter((r) => r.status === "set").length;
    const totalCount = recordsToCheck.length;

    console.log(colors.blue("\nSummary:"));
    console.log(`  Records set: ${setCount}/${totalCount}`);
    
    const successRate = Math.round((setCount / totalCount) * 100);
    if (successRate === 100) {
      console.log(colors.green(`  Status: All records verified! ✓`));
    } else if (successRate >= 50) {
      console.log(colors.yellow(`  Status: ${successRate}% complete`));
    } else {
      console.log(colors.red(`  Status: ${successRate}% complete`));
    }

    // Missing records
    const missing = results.filter((r) => r.status !== "set");
    if (missing.length > 0) {
      console.log(colors.yellow(`\nMissing Records:`));
      for (const { key } of missing) {
        console.log(colors.yellow(`  - ${key}`));
      }
    }

    console.log(`\n${colors.blue("Explorer:")} ${config.explorerUrl}/address/${owner}\n`);
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error verifying: ${e.message}`));
  }
}

