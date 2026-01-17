/**
 * Ledger Hardware Wallet Support
 *
 * Creates Viem-compatible accounts from Ledger devices.
 * Uses @ledgerhq/hw-app-eth directly for better compatibility.
 */

import {
  type Account,
  type Hash,
  type Hex,
  type SignableMessage,
  type TransactionSerializable,
  type TypedDataDefinition,
  hashMessage,
  hashTypedData,
  keccak256,
  serializeTransaction,
} from "viem";
import { toAccount } from "viem/accounts";

// Standard Ethereum HD derivation path
const BASE_DERIVATION_PATH = "m/44'/60'/0'/0";

// Cached connection
let cachedTransport: any = null;
let cachedEthApp: any = null;
let cachedAddress: `0x${string}` | null = null;
let cachedAccountIndex: number | null = null;

/**
 * Get derivation path for account index
 */
export function getDerivationPath(accountIndex = 0): string {
  return `${BASE_DERIVATION_PATH}/${accountIndex}`;
}

/**
 * Connect to Ledger device via USB/HID
 */
export async function connectLedger(): Promise<any> {
  if (cachedTransport && cachedEthApp) {
    try {
      // Test if transport is still valid by getting app config
      await cachedEthApp.getAppConfiguration();
      return cachedEthApp;
    } catch {
      cachedTransport = null;
      cachedEthApp = null;
      cachedAddress = null;
      cachedAccountIndex = null;
    }
  }

  try {
    // Dynamic import to avoid module resolution issues at build time
    const mod = await import("@ledgerhq/hw-transport-node-hid");
    const TransportNodeHid = mod.default?.default || mod.default || mod;
    const transport = await TransportNodeHid.create();
    cachedTransport = transport;

    // Create Ethereum app instance
    const ethMod = await import("@ledgerhq/hw-app-eth");
    const Eth = ethMod.default?.default || ethMod.default || ethMod;
    cachedEthApp = new Eth(transport);

    return cachedEthApp;
  } catch (error) {
    const e = error as Error;

    if (e.message.includes("cannot open device")) {
      throw new Error(
        "Cannot connect to Ledger device.\n" +
          "Please ensure:\n" +
          "  1. Ledger is connected via USB\n" +
          "  2. Ledger is unlocked (enter PIN)\n" +
          "  3. Ethereum app is open on the device"
      );
    }

    if (e.message.includes("LIBUSB")) {
      throw new Error(
        "USB access error. On macOS, ensure Terminal has USB access permissions.\n" +
          "Check System Settings > Privacy & Security > USB"
      );
    }

    throw new Error(`Ledger connection failed: ${e.message}`);
  }
}

/**
 * Get address from Ledger
 */
export async function getLedgerAddress(accountIndex = 0): Promise<`0x${string}`> {
  if (cachedAddress && cachedAccountIndex === accountIndex) {
    return cachedAddress;
  }

  const eth = await connectLedger();
  const path = getDerivationPath(accountIndex);

  try {
    const result = await eth.getAddress(path);
    cachedAddress = result.address as `0x${string}`;
    cachedAccountIndex = accountIndex;
    return cachedAddress;
  } catch (error) {
    const e = error as Error;

    if (e.message.includes("0x6d00")) {
      throw new Error(
        "Ethereum app not open on Ledger device.\n" +
          "Please open the Ethereum app and try again."
      );
    }

    throw new Error(`Failed to get Ledger address: ${e.message}`);
  }
}

/**
 * Sign a transaction hash with Ledger
 */
async function signTransactionWithLedger(
  eth: any,
  path: string,
  unsignedTx: TransactionSerializable
): Promise<Hash> {
  // Serialize the unsigned transaction
  const serialized = serializeTransaction(unsignedTx);
  // Remove 0x prefix for Ledger
  const rawTxHex = serialized.slice(2);

  try {
    const signature = await eth.signTransaction(path, rawTxHex);

    // Reconstruct the signed transaction
    const signedTx = serializeTransaction(unsignedTx, {
      r: `0x${signature.r}` as Hex,
      s: `0x${signature.s}` as Hex,
      v: BigInt(parseInt(signature.v, 16)),
    });

    return signedTx as Hash;
  } catch (error) {
    const e = error as Error;

    if (e.message.includes("0x6985") || e.message.includes("denied")) {
      throw new Error("Transaction rejected on Ledger device");
    }

    throw new Error(`Failed to sign transaction: ${e.message}`);
  }
}

/**
 * Sign a message with Ledger
 */
async function signMessageWithLedger(
  eth: any,
  path: string,
  message: SignableMessage
): Promise<Hash> {
  let messageHex: string;

  if (typeof message === "string") {
    // Convert string to hex
    messageHex = Buffer.from(message).toString("hex");
  } else if (message.raw) {
    // Raw bytes
    const raw = typeof message.raw === "string" ? message.raw : Buffer.from(message.raw).toString("hex");
    messageHex = raw.startsWith("0x") ? raw.slice(2) : raw;
  } else {
    throw new Error("Unsupported message format");
  }

  try {
    const signature = await eth.signPersonalMessage(path, messageHex);

    // Combine r, s, v into signature
    const v = parseInt(signature.v, 16);
    const recoveryBit = v >= 27 ? v - 27 : v;
    const sig = `0x${signature.r}${signature.s}${(recoveryBit + 27).toString(16).padStart(2, "0")}`;

    return sig as Hash;
  } catch (error) {
    const e = error as Error;

    if (e.message.includes("0x6985") || e.message.includes("denied")) {
      throw new Error("Message signing rejected on Ledger device");
    }

    throw new Error(`Failed to sign message: ${e.message}`);
  }
}

/**
 * Sign typed data with Ledger (EIP-712)
 */
async function signTypedDataWithLedger(
  eth: any,
  path: string,
  typedData: TypedDataDefinition
): Promise<Hash> {
  try {
    // For EIP-712, we need to use signEIP712Message if available,
    // otherwise fall back to signing the hash
    const domainSeparator = hashTypedData(typedData);

    // Try using EIP-712 signing if supported
    if (eth.signEIP712Message) {
      const signature = await eth.signEIP712Message(path, typedData);
      const v = parseInt(signature.v, 16);
      const recoveryBit = v >= 27 ? v - 27 : v;
      return `0x${signature.r}${signature.s}${(recoveryBit + 27).toString(16).padStart(2, "0")}` as Hash;
    }

    // Fallback: sign the typed data hash directly
    // Note: This requires "blind signing" to be enabled on Ledger
    const hash = hashTypedData(typedData);
    const hashHex = hash.slice(2);

    const signature = await eth.signPersonalMessage(path, hashHex);
    const v = parseInt(signature.v, 16);
    const recoveryBit = v >= 27 ? v - 27 : v;
    return `0x${signature.r}${signature.s}${(recoveryBit + 27).toString(16).padStart(2, "0")}` as Hash;
  } catch (error) {
    const e = error as Error;

    if (e.message.includes("0x6985") || e.message.includes("denied")) {
      throw new Error("Typed data signing rejected on Ledger device");
    }

    throw new Error(`Failed to sign typed data: ${e.message}`);
  }
}

/**
 * Create a Viem-compatible account from Ledger
 */
export async function getLedgerAccount(accountIndex = 0): Promise<Account> {
  const eth = await connectLedger();
  const path = getDerivationPath(accountIndex);
  const address = await getLedgerAddress(accountIndex);

  return toAccount({
    address,

    async signMessage({ message }): Promise<Hash> {
      return signMessageWithLedger(eth, path, message);
    },

    async signTransaction(transaction): Promise<Hash> {
      return signTransactionWithLedger(eth, path, transaction as TransactionSerializable);
    },

    async signTypedData(typedData): Promise<Hash> {
      return signTypedDataWithLedger(eth, path, typedData as TypedDataDefinition);
    },
  });
}

/**
 * Close Ledger connection
 */
export async function closeLedger(): Promise<void> {
  if (cachedTransport) {
    try {
      await cachedTransport.close();
    } catch {
      // Ignore close errors
    }
    cachedTransport = null;
    cachedEthApp = null;
    cachedAddress = null;
    cachedAccountIndex = null;
  }
}
