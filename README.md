# basenames-cli
![Basenames CLI](public/spacing.png)

A CLI for managing Basenames on Base (L2)

## Features

- **Full Registration Flow** — Register basenames directly from the command line with availability checks, price quotes, and anti-frontrunning protection
- **Smart Contract Naming** — Name your smart contracts with subnames under your basename, with full forward and reverse resolution support
- **Name Discovery** — List all basenames owned by any address via ENSNode indexing (see note on indexing gaps)
- **Record Verification** — Verify that all onchain records are correctly configured
- **ENSNode Integration** — Fast, fully indexed ENS queries with automatic onchain fallback
- **Complete Record Management** — Edit text records, addresses, resolvers, ABIs, and content hashes

## Installation

### Local Development Setup

1. Install dependencies:

```bash
cd basenames-cli
npm install
````

2. Build the CLI:

```bash
npm run build
```

3. Link it globally (so you can use `basenames` from anywhere):

```bash
npm link
```

Now you can use `basenames` from any directory:

```bash
basenames resolve myname
```

### Alternative: Use Without Linking

If you don't want to link globally, you can use it directly:

```bash
# From the basenames-cli directory
npm run dev -- resolve myname

# Or using tsx directly
npx tsx src/index.ts resolve myname

# Or using the built version
node dist/index.js resolve myname
```

### Uninstall

To remove the global link:

```bash
npm unlink -g @basenames/cli
```

## Networks

Basenames CLI supports both **Base Mainnet** and **Base Sepolia** testnet.

| Network      | Parent Domain  | Chain ID |
| ------------ | -------------- | -------- |
| Base Mainnet | `base.eth`     | 8453     |
| Base Sepolia | `basetest.eth` | 84532    |

### Switching Networks

Use the `--network` flag (or `-n`) to switch between networks:

```bash
# Use Base Sepolia testnet (default)
basenames resolve myname

# Use Base Mainnet
basenames resolve myname --network base
basenames resolve myname -n base
```

### Environment Variables

```bash
# Private key for write operations (required for register/edit commands)
export BASENAMES_PRIVATE_KEY="0x..."

# Network-specific RPC URLs (recommended)
export BASE_RPC_URL_BASE="https://base.drpc.org"
```
<<<<<<< HEAD
=======

**Priority order for RPC URLs:**
1. Network-specific URL (`BASE_RPC_URL_BASE` or `BASE_RPC_URL_BASESEPOLIA`)
2. Generic URL (`BASE_RPC_URL`)
3. Default from config (network-specific default)

## Registration & Discovery

### `register`

Register a new basename with a complete flow: availability check, price calculation, commitment, and registration.

```bash
# Register a basename for 1 year
basenames register coolname

# Register for multiple years
basenames register coolname --years 2

# Register on mainnet
basenames register coolname -n base
```

### `available`

Check if a basename is available for registration with price quote.

```bash
basenames available coolname
# ✓ coolname.basetest.eth is available!
# Price: 0.001 ETH/year
```

### `list`

List all basenames owned by an address.

```bash
basenames list 0x1234567890123456789012345678901234567890
```

> **Note on ENSNode Indexing:** The `list` command relies on ENSNode's indexed data. Some basenames may not appear in the list if they haven't been indexed yet by ENSNode, even though they exist on-chain. This is a known indexing gap that has been communicated to the ENSNode team. You can still query individual names that aren't indexed using `basenames profile <name>` or `basenames resolve <name>`, which use direct on-chain queries.

### `verify`

Verify that all records for a basename are correctly set onchain.

```bash
basenames verify myname

# Verifying myname.basetest.eth
# ============================
# ✓ Resolver is set
# ✓ Address record matches owner
# ✓ Primary name is set
# ✓ All records verified!
```

## Smart Contract Naming

Name your smart contracts on Base with ENS subnames. This enables both forward resolution (name → address) and reverse resolution (address → name).

### `name`

Assign a basename to a smart contract you own.

```bash
# Name a contract under your basename
basenames name <contract-address> <label> --parent <your-basename>

# Example: Name contract as "vault.myname.basetest.eth"
basenames name 0x1234...5678 vault --parent myname.basetest.eth

# Skip reverse resolution (forward only)
basenames name 0x1234...5678 vault --parent myname.basetest.eth --no-reverse
```

**What this does:**
1. Verifies you own the parent domain
2. Creates the subname via the ENS Registry
3. Sets forward resolution (name → contract address) with L2 coin type
4. Sets reverse resolution (contract address → name) if the contract supports it

### Reverse Resolution Requirements

For reverse resolution to work, your contract must implement **ERC173 (Ownable)**:

```solidity
function owner() external view returns (address);
```

The `owner()` function must return an address you control. This is how the L2 Reverse Registrar verifies you're authorized to set the contract's primary name.

**Common patterns that work:**
- OpenZeppelin's `Ownable`
- Custom `owner()` implementations
- Any ERC173-compliant contract

**If your contract doesn't have `owner()`:** Forward resolution will still work, but reverse resolution will be skipped with a warning.

### Testing with a Sample Contract

A test contract and deployment script are included for testing the naming flow:

```bash
# Deploy an Ownable test contract to Base Sepolia
npx tsx scripts/deploy-ownable-contract.ts

# The script will output the deployed address and next steps
# ✅ Ownable contract deployed successfully!
#    Address: 0x1234...5678
#
# 📝 Next step - name this contract:
#    basenames name 0x1234...5678 mycontract --parent yourname.basetest.eth
```

**Prerequisites for the deploy script:**
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- `BASENAMES_PRIVATE_KEY` set in `.env.local`
- Base Sepolia ETH in your wallet

## Read Commands

### `resolve`

Resolve a basename to an address or vice versa.

```bash
# Resolve basename to address
basenames resolve vitalik
# 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Resolve address to basename (reverse lookup)
basenames resolve 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
# vitalik.basetest.eth

# Get a specific TXT record
basenames resolve myname --txt com.github
# myusername
```

### `profile`

Display a complete Basename profile with all records.

```bash
basenames profile myname

# Basenames Profile
# =================
#
# Name:        myname.basetest.eth
# Address:     0x1234567890123456789012345678901234567890
# Owner:       0x1234567890123456789012345678901234567890
# Resolver:    0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA
# Primary:     ✓ Set
# Expires:     2/5/2026
#
# Text Records:
# Avatar:      https://example.com/avatar.png
# Bio:         Hello, I'm on Base!
# Twitter:     myhandle
```

### `resolver`

Get the current resolver address for a basename.

```bash
basenames resolver myname
# 0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA
```

### `namehash`

Generate a namehash for a basename.

```bash
basenames namehash myname
```

### `labelhash`

Generate a labelhash for a label.

```bash
basenames labelhash myname
```

### `deployments`

List deployed Basenames contracts for all networks.

```bash
basenames deployments
```

## Edit Commands

Edit commands require setting the `BASENAMES_PRIVATE_KEY` environment variable.

```bash
export BASENAMES_PRIVATE_KEY="0x..."
```

> ⚠️ **Security Warning:** Never commit your private key or add it permanently to shell config files!

### `edit txt`

Set or clear a text record.

```bash
basenames edit txt myname com.github myusername
basenames edit txt myname com.github null  # clear
```

**Standard text keys:** `avatar`, `description`, `display`, `email`, `url`, `com.github`, `com.twitter`, `com.discord`, `com.warpcast`, `org.telegram`

### `edit address`

Set or clear an address record.

```bash
basenames edit address myname ETH 0x1234...
```

### `edit primary`

Set the primary basename for your address.

```bash
basenames edit primary myname
```

### `edit resolver`

Set the resolver for a basename.

```bash
basenames edit resolver myname 0x6533...
```

### `edit abi`

Set or clear an ABI record.

```bash
basenames edit abi myname ./contract-abi.json
```

### `edit contenthash`

Set or clear a content hash.

```bash
basenames edit contenthash myname ipfs://QmRAQB6Y...
```

## Contract Addresses

### Base Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| Registry | `0x1493b2567056c2181630115660963E13A8E32735` |
| L2Resolver | `0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA` |
| RegistrarController | `0x49aE3cC2e3AA768B1e5654f5D3C6002144A59581` |
| BaseRegistrar | `0xa0c70ec36c010b55e3c434d6c6ebeec50c705794` |
| ReverseRegistrar | `0x876eF94ce0773052a2f81921E70FF25a5e76841f` |

### Base Mainnet

| Contract | Address |
|----------|---------|
| Registry | `0xb94704422c2a1e396835a571837aa5ae53285a95` |
| L2Resolver | `0xC6d566A56A1aFf6508b41f6c90ff131615583BCD` |
| RegistrarController | `0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5` |
| BaseRegistrar | `0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a` |
| ReverseRegistrar | `0x79ea96012eea67a83431f1701b3dff7e37f9e282` |

## Known Issues & Limitations

### ENSNode Indexing Gap

The `list` command relies entirely on ENSNode's indexed data. Some basenames may not appear in the list if they haven't been indexed yet by ENSNode, even though they exist on-chain and are fully functional.

**What this means:**
- Names that aren't indexed won't appear in `basenames list <address>`
- You can still query individual names using `basenames profile <name>` or `basenames resolve <name>`
- All other commands work normally (they use direct on-chain queries)

**Status:** This indexing gap has been communicated to the ENSNode team. The issue affects a subset of basenames and appears to be related to how ENSNode processes registration events from certain contracts or during specific time periods.

**Workaround:** Use `basenames profile <name>` to query individual names that don't appear in the list.

## License

MIT
>>>>>>> 0cad031 (Add `name` command for naming smart contracts on Base)
