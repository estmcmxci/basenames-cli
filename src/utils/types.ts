import type { Address } from "viem";

/**
 * Ledger wallet options for write operations
 */
export type LedgerOptions = {
  useLedger?: boolean;
  accountIndex?: number;
};

export type ResolveOptions = {
  input: string;
  txt?: string;
  contenthash?: boolean;
  resolverAddress?: string;
  network?: string;
};

export type ProfileOptions = {
  input: string;
  resolverAddress?: string;
  network?: string;
};

export type AvailableOptions = {
  name: string;
  showPrice?: boolean;
  network?: string;
};

export type RegisterOptions = {
  name: string;
  owner?: string;
  address?: string;
  duration?: string;
  txt?: string[];
  primary?: boolean;
  network?: string;
} & LedgerOptions;

export type EditTxtOptions = {
  name: string;
  key: string;
  value: string;
  resolverAddress?: string;
  network?: string;
} & LedgerOptions;

export type EditAddressOptions = {
  name: string;
  value: string;
  resolverAddress?: string;
  network?: string;
} & LedgerOptions;

export type EditPrimaryOptions = {
  name: string;
  address?: string;
  network?: string;
} & LedgerOptions;

export type ListOptions = {
  address: string;
  network?: string;
};

export type VerifyOptions = {
  name: string;
  expectedRecords?: string[];
  network?: string;
};

export type BasenameRecord = {
  name: string;
  node: `0x${string}`;
  owner: Address | null;
  resolver: Address | null;
  addressRecord: Address | null;
  primaryName: string | null;
  expiryDate: Date | null;
  textRecords: Record<string, string | null>;
};

export type RegistrationResult = {
  txHash: `0x${string}`;
  fullName: string;
  node: `0x${string}`;
  owner: Address;
  price: bigint;
  expiryDate: Date;
};

export type NameContractOptions = {
  contractAddress: string;
  name: string;
  parent?: string;
  noReverse?: boolean;
  checkCompatibility?: boolean;
  network?: string;
} & LedgerOptions;

