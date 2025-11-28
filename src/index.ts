#!/usr/bin/env -S node --no-deprecation
/**
 * Basenames CLI
 * 
 * A CLI for managing Basenames on Base Sepolia and Base Mainnet.
 * Based on the Atlas CLI architecture with ENSNode integration.
 * 
 * Usage:
 *   basenames resolve <name|address>
 *   basenames profile <name|address>
 *   basenames available <name>
 *   basenames register <name> --owner <address>
 *   basenames list <address>
 *   basenames verify <name>
 *   basenames edit txt <name> <key> <value>
 *   basenames edit address <name> <address>
 *   basenames edit primary <name>
 *   basenames namehash <name>
 *   basenames labelhash <label>
 *   basenames resolver <name>
 *   basenames deployments
 */

import {
  binary,
  command,
  flag,
  option,
  optional,
  positional,
  run,
  string,
  subcommands,
  multioption,
  array,
} from "cmd-ts";
import {
  resolve as resolveCmd,
  profile as profileCmd,
  available as availableCmd,
  register as registerCmd,
  list as listCmd,
  verify as verifyCmd,
  setTxt as setTxtCmd,
  setAddress as setAddressCmd,
  setPrimary as setPrimaryCmd,
  getNamehash,
  getLabelHash,
  getResolverAddress,
  getDeployments,
} from "./commands";

// =============================================================================
// Read Commands
// =============================================================================

const resolve = command({
  name: "resolve",
  description: "Resolve a basename to an address or vice versa",
  args: {
    input: positional({
      type: string,
      description: "Basename or address to resolve",
    }),
    txt: option({
      type: optional(string),
      description: "Query a specific text record",
      long: "txt",
      short: "t",
    }),
    contenthash: flag({
      long: "contenthash",
      short: "c",
      description: "Fetch the content hash",
    }),
    resolverAddress: option({
      type: optional(string),
      long: "resolver",
      short: "r",
      description: "Specify a custom resolver address",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.input) {
      console.log("Usage: basenames resolve <name|address>");
      return;
    }
    await resolveCmd(args);
  },
});

const profile = command({
  name: "profile",
  description: "Display a complete profile for a basename",
  args: {
    input: positional({
      type: string,
      description: "Basename or address to query",
    }),
    resolverAddress: option({
      type: optional(string),
      long: "resolver",
      short: "r",
      description: "Specify a custom resolver address",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.input) {
      console.log("Usage: basenames profile <name|address>");
      return;
    }
    await profileCmd(args);
  },
});

const available = command({
  name: "available",
  description: "Check if a basename is available for registration",
  args: {
    name: positional({
      type: string,
      description: "Basename to check",
    }),
    noPrice: flag({
      long: "no-price",
      description: "Skip showing registration price",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames available <name>");
      return;
    }
    await availableCmd({ name: args.name, showPrice: !args.noPrice, network: args.network });
  },
});

const list = command({
  name: "list",
  description: "List all basenames owned by an address",
  args: {
    address: positional({
      type: string,
      description: "Address to query",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.address) {
      console.log("Usage: basenames list <address>");
      return;
    }
    await listCmd(args);
  },
});

// =============================================================================
// Write Commands
// =============================================================================

const register = command({
  name: "register",
  description: "Register a new basename",
  args: {
    name: positional({
      type: string,
      description: "Basename to register (without .basetest.eth)",
    }),
    owner: option({
      type: optional(string),
      long: "owner",
      short: "o",
      description: "Owner address for the basename (defaults to signer from BASENAMES_PRIVATE_KEY)",
    }),
    address: option({
      type: optional(string),
      long: "address",
      short: "a",
      description: "Address record to set (defaults to owner)",
    }),
    duration: option({
      type: optional(string),
      long: "duration",
      short: "d",
      description: "Registration duration (e.g., 1y, 6m, 30d). Default: 1y",
    }),
    txt: multioption({
      type: array(string),
      long: "txt",
      short: "t",
      description: "Text record to set (format: key=value). Can be used multiple times.",
    }),
    primary: flag({
      long: "primary",
      short: "p",
      description: "Set as primary name for owner",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames register <name> [--owner <address>] [options]");
      console.log("\nOptions:");
      console.log("  --owner, -o    Owner address (defaults to signer from BASENAMES_PRIVATE_KEY)");
      console.log("  --address, -a  Address record to set");
      console.log("  --duration, -d Duration (1y, 6m, 30d)");
      console.log("  --txt, -t      Text record (key=value)");
      console.log("  --primary, -p  Set as primary name");
      console.log("  --network, -n  Network (baseSepolia, base)");
      return;
    }
    await registerCmd(args);
  },
});

const verify = command({
  name: "verify",
  description: "Verify that records are correctly set for a basename",
  args: {
    name: positional({
      type: string,
      description: "Basename to verify",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames verify <name>");
      return;
    }
    await verifyCmd({ name: args.name, network: args.network });
  },
});

// =============================================================================
// Edit Subcommands
// =============================================================================

const editTxt = command({
  name: "txt",
  description: "Set or clear a text record (use 'null' to clear)",
  args: {
    name: positional({
      type: string,
      description: "Target basename",
    }),
    key: positional({
      type: string,
      description: "Text record key (e.g., com.github, description)",
    }),
    value: positional({
      type: string,
      description: "Value to set (use 'null' to clear)",
    }),
    resolverAddress: option({
      type: optional(string),
      long: "resolver",
      short: "r",
      description: "Resolver address (auto-detected if not provided)",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name || !args.key || args.value === undefined) {
      console.log("Usage: basenames edit txt <name> <key> <value>");
      return;
    }
    await setTxtCmd({
      name: args.name,
      key: args.key,
      value: args.value,
      resolverAddress: args.resolverAddress,
      network: args.network,
    });
  },
});

const editAddress = command({
  name: "address",
  description: "Set the address record for a basename",
  args: {
    name: positional({
      type: string,
      description: "Target basename",
    }),
    value: positional({
      type: string,
      description: "Address to set",
    }),
    resolverAddress: option({
      type: optional(string),
      long: "resolver",
      short: "r",
      description: "Resolver address (auto-detected if not provided)",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name || !args.value) {
      console.log("Usage: basenames edit address <name> <address>");
      return;
    }
    await setAddressCmd({
      name: args.name,
      value: args.value,
      resolverAddress: args.resolverAddress,
      network: args.network,
    });
  },
});

const editPrimary = command({
  name: "primary",
  description: "Set the primary name for your address (reverse record)",
  args: {
    name: positional({
      type: string,
      description: "Basename to set as primary",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames edit primary <name>");
      return;
    }
    await setPrimaryCmd({ name: args.name, network: args.network });
  },
});

const edit = subcommands({
  name: "edit",
  description: "Edit records for a basename",
  cmds: {
    txt: editTxt,
    address: editAddress,
    primary: editPrimary,
  },
});

// =============================================================================
// Utility Commands
// =============================================================================

const namehash = command({
  name: "namehash",
  description: "Get the namehash for an ENS name or basename node",
  args: {
    name: positional({
      type: string,
      description: "Name to hash",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames namehash <name>");
      return;
    }
    await getNamehash({ name: args.name, network: args.network });
  },
});

const labelhash = command({
  name: "labelhash",
  description: "Get the labelhash for a single label",
  args: {
    name: positional({
      type: string,
      description: "Label to hash",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames labelhash <label>");
      return;
    }
    await getLabelHash(args);
  },
});

const resolver = command({
  name: "resolver",
  description: "Get the resolver address for a basename",
  args: {
    name: positional({
      type: string,
      description: "Target basename",
    }),
    network: option({
      type: optional(string),
      long: "network",
      short: "n",
      description: "Network to use (baseSepolia, base)",
    }),
  },
  handler: async (args) => {
    if (!args.name) {
      console.log("Usage: basenames resolver <name>");
      return;
    }
    await getResolverAddress({ name: args.name, network: args.network });
  },
});

const deployments = command({
  name: "deployments",
  description: "Display Basenames contract addresses",
  args: {},
  handler: () => {
    getDeployments();
  },
});

// =============================================================================
// Main CLI
// =============================================================================

const cli = subcommands({
  name: "basenames",
  description: `
  ____                                                   
 |  _ \\                                                  
 | |_) | __ _ ___  ___ _ __   __ _ _ __ ___   ___  ___   
 |  _ < / _\` / __|/ _ \\ '_ \\ / _\` | '_ \` _ \\ / _ \\/ __|  
 | |_) | (_| \\__ \\  __/ | | | (_| | | | | | |  __/\\__ \\  
 |____/ \\__,_|___/\\___|_| |_|\\__,_|_| |_| |_|\\___||___/  
                                                         
  CLI for managing Basenames on Base
  
  Environment Variables:
    BASENAMES_PRIVATE_KEY  - Private key for write operations
    BASE_RPC_URL           - Custom RPC URL (default: https://sepolia.base.org)
    BASENAMES_NETWORK      - Network to use (baseSepolia, base)
  
  Examples:
    basenames available myname
    basenames register myname --owner 0x1234...
    basenames resolve myname.basetest.eth
    basenames profile 0x1234...
    basenames edit txt myname description "My basename"
    basenames edit primary myname
  `,
  version: "0.1.0",
  cmds: {
    // Read commands
    resolve,
    profile,
    available,
    list,
    // Write commands
    register,
    verify,
    edit,
    // Utility commands
    namehash,
    labelhash,
    resolver,
    deployments,
  },
});

// =============================================================================
// Entry Point
// =============================================================================

async function main() {
  // Check if this is a help request
  const isHelpRequest =
    process.argv.includes("--help") ||
    process.argv.includes("-h") ||
    process.argv.length === 2; // Just "basenames" with no subcommand

  // Intercept process.exit to handle help requests cleanly
  const originalExit = process.exit;
  process.exit = ((code?: number) => {
    // If it's a help request and exit code is 1, change to 0
    if (isHelpRequest && code === 1) {
      return originalExit(0);
    }
    return originalExit(code);
  }) as typeof process.exit;

  try {
    await run(binary(cli), process.argv);
  } catch (error) {
    const e = error as Error;
    // cmd-ts may throw when showing help - treat as success
    if (isHelpRequest || e.message.includes("subcommand")) {
      process.exit(0);
      return;
    }
    console.error("Error:", e.message);
    process.exit(1);
  }
}

main();

