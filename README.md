# basenames-cli
![Basenames CLI](public/spacing.png)

A CLI for managing Basenames on Base (L2)

## Features

- **Full Registration Flow** — Register basenames directly from the command line with availability checks, price quotes, and anti-frontrunning protection
- **Name Discovery** — List all basenames owned by any address via ENSNode indexing
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
