/**
 * Deploy an Ownable test contract to Base Sepolia
 *
 * This contract implements ERC173 (Ownable) so reverse resolution can work.
 * Reverse resolution requires the contract to have an owner() function that
 * returns the address authorized to set the contract's primary name.
 *
 * Prerequisites:
 *   - Foundry installed (https://book.getfoundry.sh/getting-started/installation)
 *   - BASENAMES_PRIVATE_KEY set in .env.local
 *   - Base Sepolia ETH in your wallet
 *
 * Usage: npx tsx scripts/deploy-ownable-contract.ts
 */

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      let trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        if (trimmed.startsWith("export ")) {
          trimmed = trimmed.slice(7);
        }
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          let value = valueParts.join("=").trim();
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key.trim()] = value;
        }
      }
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }
}

loadEnv();

// Find forge executable
function findForge(): string {
  const commonPaths = [
    resolve(process.env.HOME || "", ".foundry/bin/forge"),
    "/usr/local/bin/forge",
    "/opt/homebrew/bin/forge",
  ];

  for (const forgePath of commonPaths) {
    if (existsSync(forgePath)) {
      return forgePath;
    }
  }

  // Try PATH
  try {
    execSync("which forge", { stdio: "pipe" });
    return "forge";
  } catch {
    throw new Error(
      "Foundry not found. Install it from https://book.getfoundry.sh/getting-started/installation"
    );
  }
}

// Compile the contract and get bytecode
function compileContract(): { bytecode: `0x${string}`; abi: readonly unknown[] } {
  const forge = findForge();
  const solPath = resolve(__dirname, "OwnableTest.sol");
  const outDir = resolve(__dirname, ".forge-out");

  console.log("Compiling OwnableTest.sol with Foundry...");

  try {
    execSync(`${forge} build "${solPath}" --out "${outDir}"`, {
      stdio: "pipe",
      cwd: __dirname,
    });
  } catch (error) {
    throw new Error(`Compilation failed: ${error}`);
  }

  // Read the compiled artifact
  const artifactPath = resolve(outDir, "OwnableTest.sol", "OwnableTest.json");
  if (!existsSync(artifactPath)) {
    throw new Error(`Compiled artifact not found at ${artifactPath}`);
  }

  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  return {
    bytecode: artifact.bytecode.object as `0x${string}`,
    abi: artifact.abi,
  };
}

async function main() {
  // Get private key from environment
  const privateKey = process.env.BASENAMES_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: BASENAMES_PRIVATE_KEY not set in .env.local");
    process.exit(1);
  }

  // Compile the contract
  const { bytecode, abi } = compileContract();
  console.log("Compilation successful!\n");

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Deploying from: ${account.address}`);

  // Create clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${Number(balance) / 1e18} ETH`);

  if (balance === 0n) {
    console.error("Error: No ETH balance. Get some from https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }

  // Deploy the contract
  console.log("\nDeploying Ownable contract...");

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
  });

  console.log(`Transaction hash: ${hash}`);
  console.log("Waiting for confirmation...");

  // Wait for the transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 2,
  });

  if (receipt.status === "success" && receipt.contractAddress) {
    console.log(`\n✅ Ownable contract deployed successfully!`);
    console.log(`   Address: ${receipt.contractAddress}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Explorer: https://sepolia.basescan.org/address/${receipt.contractAddress}`);

    // Verify owner
    console.log(`\nVerifying owner()...`);
    const owner = await publicClient.readContract({
      address: receipt.contractAddress,
      abi,
      functionName: "owner",
    });
    console.log(`   Owner: ${owner}`);
    console.log(`   Matches deployer: ${(owner as string).toLowerCase() === account.address.toLowerCase()}`);

    console.log(`\n📝 Next step - name this contract:`);
    console.log(`   basenames name ${receipt.contractAddress} <label> --parent <your-basename>`);
    console.log(`\n   Example:`);
    console.log(`   basenames name ${receipt.contractAddress} mycontract --parent yourname.basetest.eth`);
  } else {
    console.error("❌ Deployment failed");
    console.error(receipt);
  }
}

main().catch(console.error);
