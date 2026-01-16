/**
 * Name Command
 *
 * Assign an ENS name to a smart contract on Base.
 * Inspired by the enscribe library (https://github.com/enscribexyz/enscribe)
 * Follows ENSIP-10 and ENSIP-19 standards.
 */

import colors from "yoctocolors";
import { isAddress, namehash, keccak256, toBytes } from "viem";
import { normalize } from "viem/ens";
import {
  startSpinner,
  stopSpinner,
  checkParentOwnership,
  getResolverFromParent,
  createSubname,
  setAddressRecordWithCoinType,
  setReverseResolutionL2,
  calculateSubnameNode,
  getPublicClient,
  getNetworkConfig,
} from "../utils";
import { getCoinType } from "../config/deployments";

export type NameContractOptions = {
  contractAddress: string;
  name: string;
  parent?: string;
  noReverse?: boolean;
  checkCompatibility?: boolean;
  network?: string;
};

/**
 * Check if a contract supports the Ownable interface (ERC173)
 * This is informational only - doesn't block the operation
 */
async function checkContractCompatibility(
  contractAddress: `0x${string}`,
  network?: string
): Promise<{ hasOwner: boolean; owner?: string }> {
  const client = getPublicClient(network);

  const OWNABLE_ABI = [
    {
      name: "owner",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
  ] as const;

  try {
    const owner = await client.readContract({
      address: contractAddress,
      abi: OWNABLE_ABI,
      functionName: "owner",
    });
    return { hasOwner: true, owner: owner as string };
  } catch {
    return { hasOwner: false };
  }
}

/**
 * Name a smart contract with an ENS name
 */
export async function nameContract(options: NameContractOptions) {
  const { contractAddress, name, parent, noReverse, checkCompatibility } = options;
  const config = getNetworkConfig(options.network);

  // Validate contract address
  if (!isAddress(contractAddress)) {
    console.error(colors.red("Error: Invalid contract address"));
    console.error(colors.yellow("Please provide a valid Ethereum address (0x...)"));
    return;
  }

  // Normalize the name label
  let normalizedLabel: string;
  try {
    normalizedLabel = normalize(name);
  } catch (error) {
    console.error(colors.red("Error: Invalid name"));
    console.error(colors.yellow("The name contains invalid characters"));
    return;
  }

  // Resolve parent domain
  const parentDomain = parent || config.parentDomain;
  const fullName = `${normalizedLabel}.${parentDomain}`;

  console.log(colors.blue("\nName Smart Contract"));
  console.log(colors.blue("===================\n"));
  console.log(`${colors.blue("Contract:")}     ${contractAddress}`);
  console.log(`${colors.blue("Name:")}         ${fullName}`);
  console.log(`${colors.blue("Parent:")}       ${parentDomain}`);
  console.log(`${colors.blue("Network:")}      ${options.network || "baseSepolia"}`);
  console.log(`${colors.blue("Reverse:")}      ${noReverse ? "No" : "Yes"}`);

  // Calculate nodes
  const parentNode = namehash(parentDomain) as `0x${string}`;
  const labelHashValue = keccak256(toBytes(normalizedLabel)) as `0x${string}`;
  const subnameNode = calculateSubnameNode(parentNode, labelHashValue);

  console.log(`\n${colors.dim("Parent Node:")}  ${parentNode}`);
  console.log(`${colors.dim("Label Hash:")}   ${labelHashValue}`);
  console.log(`${colors.dim("Subname Node:")} ${subnameNode}`);

  // Check contract compatibility if requested
  if (checkCompatibility) {
    console.log(colors.blue("\nChecking contract compatibility..."));
    startSpinner("Checking for Ownable interface...");
    const compat = await checkContractCompatibility(contractAddress as `0x${string}`, options.network);
    stopSpinner();

    if (compat.hasOwner) {
      console.log(colors.green(`✓ Contract has owner() function`));
      console.log(`  ${colors.dim("Owner:")} ${compat.owner}`);
    } else {
      console.log(colors.yellow("⚠ Contract does not have owner() function"));
      console.log(colors.dim("  This is informational only - naming will proceed."));
    }
  }

  // Step 1: Check parent ownership
  console.log(colors.blue("\nStep 1: Checking parent domain ownership..."));
  startSpinner("Verifying ownership...");

  try {
    const isOwner = await checkParentOwnership(parentNode, options.network);
    stopSpinner();

    if (!isOwner) {
      console.error(colors.red(`\n✗ You don't own the parent domain '${parentDomain}'`));
      console.error(colors.yellow("Please ensure you're using the correct private key"));
      console.error(colors.yellow("and that you own this domain."));
      return;
    }
    console.log(colors.green("✓ Parent domain ownership verified"));
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error checking ownership: ${e.message}`));
    return;
  }

  // Step 2: Create subname
  console.log(colors.blue("\nStep 2: Creating subname..."));
  startSpinner("Creating subname...");

  let createTxHash: `0x${string}` | null = null;
  try {
    createTxHash = await createSubname(parentNode, labelHashValue, options.network);
    stopSpinner();

    if (createTxHash) {
      console.log(colors.green(`✓ Subname created`));
      console.log(`  ${colors.dim("Tx:")} ${createTxHash}`);
    } else {
      console.log(colors.green("✓ Subname already exists and you own it"));
    }
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error creating subname: ${e.message}`));
    return;
  }

  // Step 3: Set forward resolution (address record)
  console.log(colors.blue("\nStep 3: Setting forward resolution..."));
  startSpinner("Setting address record...");

  let forwardTxHash: `0x${string}` | null = null;
  try {
    const resolver = await getResolverFromParent(parentNode, options.network);
    const coinType = getCoinType(options.network);

    forwardTxHash = await setAddressRecordWithCoinType(
      subnameNode,
      contractAddress as `0x${string}`,
      coinType,
      resolver,
      options.network
    );
    stopSpinner();

    if (forwardTxHash) {
      console.log(colors.green(`✓ Forward resolution set`));
      console.log(`  ${colors.dim("Tx:")} ${forwardTxHash}`);
      console.log(`  ${colors.dim("Coin Type:")} ${coinType}`);
    } else {
      console.log(colors.green("✓ Forward resolution already set correctly"));
    }
  } catch (error) {
    stopSpinner();
    const e = error as Error;
    console.error(colors.red(`Error setting forward resolution: ${e.message}`));
    return;
  }

  // Step 4: Set reverse resolution (unless --no-reverse)
  let reverseTxHash: `0x${string}` | null = null;
  if (!noReverse) {
    console.log(colors.blue("\nStep 4: Setting reverse resolution..."));
    startSpinner("Setting primary name...");

    try {
      reverseTxHash = await setReverseResolutionL2(
        contractAddress as `0x${string}`,
        fullName,
        options.network
      );
      stopSpinner();

      if (reverseTxHash) {
        console.log(colors.green(`✓ Reverse resolution set`));
        console.log(`  ${colors.dim("Tx:")} ${reverseTxHash}`);
      } else {
        console.log(colors.green("✓ Reverse resolution already set correctly"));
      }
    } catch (error) {
      stopSpinner();
      const e = error as Error;
      // Graceful degradation - warn but don't fail
      console.log(colors.yellow(`⚠ Could not set reverse resolution: ${e.message}`));
      console.log(colors.dim("  This is non-critical. Forward resolution was successful."));
    }
  } else {
    console.log(colors.dim("\nStep 4: Skipping reverse resolution (--no-reverse)"));
  }

  // Summary
  console.log(colors.green("\n" + "═".repeat(50)));
  console.log(colors.green("✓ Contract naming complete!"));
  console.log(colors.green("═".repeat(50)));

  console.log(`\n${colors.blue("Contract:")}  ${contractAddress}`);
  console.log(`${colors.blue("Name:")}      ${fullName}`);

  console.log(colors.blue("\nTransactions:"));
  if (createTxHash) {
    console.log(`  Subname:  ${config.explorerUrl}/tx/${createTxHash}`);
  }
  if (forwardTxHash) {
    console.log(`  Forward:  ${config.explorerUrl}/tx/${forwardTxHash}`);
  }
  if (reverseTxHash) {
    console.log(`  Reverse:  ${config.explorerUrl}/tx/${reverseTxHash}`);
  }

  console.log(colors.blue("\nVerify:"));
  console.log(`  basenames resolve ${fullName}`);
  console.log(`  basenames resolve ${contractAddress}`);
}
