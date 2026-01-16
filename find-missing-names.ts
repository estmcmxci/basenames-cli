#!/usr/bin/env tsx
/**
 * Find Missing Names Script
 * 
 * Usage:
 *   tsx find-missing-names.ts <address> [network]
 * 
 * This script:
 * 1. Uses `basenames list` to get ENSNode indexed names for an address
 * 2. Provides instructions for manually checking names on-chain
 * 3. Helps identify names that exist on-chain but aren't indexed
 */

import { execSync } from "child_process";
import { isAddress } from "viem";

const address = process.argv[2];
const network = process.argv[3] || "baseSepolia";

if (!address || !isAddress(address)) {
  console.error("Usage: tsx find-missing-names.ts <address> [network]");
  console.error("\nExample:");
  console.error("  tsx find-missing-names.ts 0x1234... baseSepolia");
  process.exit(1);
}

console.log(`\n🔍 Checking names for address: ${address}`);
console.log(`   Network: ${network}\n`);
console.log("=".repeat(60));

try {
  // Use the basenames CLI to list names
  console.log("\n📋 Querying ENSNode for indexed names...\n");
  const result = execSync(`node dist/index.js list ${address} ${network !== "baseSepolia" ? `--network ${network}` : ""}`, {
    encoding: "utf-8",
    cwd: __dirname,
  });
  
  console.log(result);
  
  console.log("\n" + "=".repeat(60));
  console.log("📝 Next Steps:");
  console.log("=".repeat(60));
  console.log("\n1. If you know specific names owned by this address,");
  console.log("   verify them individually:");
  console.log(`   basenames profile <name> --network ${network}`);
  console.log("\n2. If a name exists on-chain but wasn't in the list above,");
  console.log("   that's a missing name! Add it to the issue report.");
  console.log("\n3. To check a specific name on-chain:");
  console.log(`   basenames resolve <name> --network ${network}`);
  console.log("\n");
  
} catch (error: any) {
  const output = error.stdout?.toString() || error.message || String(error);
  
  if (output.includes("No basenames found")) {
    console.log(output);
    console.log("\n⚠️  ENSNode returned no names for this address.");
    console.log("   This could mean:");
    console.log("   - The address doesn't own any basenames");
    console.log("   - The names aren't indexed yet (indexing gap)");
    console.log("\n   Try checking specific names you know exist:");
    console.log(`   basenames profile <name> --network ${network}`);
  } else {
    console.error("Error:", output);
  }
}


