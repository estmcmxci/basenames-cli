import { createPublicClient, http, keccak256, toBytes } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia.drpc.org'),
});

const BASE_REGISTRAR = '0xa0c70ec36c010b55e3c434d6c6ebeec50c705794';
const LEGACY_CONTROLLER = '0x49aE3cC2e3AA768B1e5654f5D3C6002144A59581'.toLowerCase();
const UPGRADEABLE_CONTROLLER = '0x82c858CDF64b3D893Fe54962680edFDDC37e94C8'.toLowerCase();

// NameRegistered event signature
const NAME_REGISTERED_SIG = '0xb3d987963d01b2f68493b4bdb130988f157ea43070d4ad840fee0466ed9370d9';

async function findRegistrationTx(label: string): Promise<void> {
  const labelHash = keccak256(toBytes(label));
  
  console.log(`\n${label}.basetest.eth`);
  console.log(`  LabelHash: ${labelHash.slice(0, 18)}...`);
  
  // Use BaseScan API to find registration events
  const url = `https://api-sepolia.basescan.org/api?module=logs&action=getLogs&address=${BASE_REGISTRAR}&topic0=${NAME_REGISTERED_SIG}&topic1=${labelHash}&fromBlock=0&toBlock=latest`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '0' || !data.result || data.result.length === 0) {
      console.log('  ❌ No registration events found via BaseScan');
      return;
    }
    
    const log = data.result[0];
    const txHash = log.transactionHash;
    const blockNumber = parseInt(log.blockNumber, 16);
    
    console.log(`  TX: ${txHash.slice(0, 18)}...`);
    console.log(`  Block: ${blockNumber}`);
    
    // Get transaction details to see which contract was called
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    const toAddr = tx.to?.toLowerCase();
    
    console.log(`  To: ${tx.to}`);
    
    if (toAddr === LEGACY_CONTROLLER) {
      console.log(`  ✅ Controller: LEGACY (0x49aE...9581) - INDEXED by ENSNode`);
    } else if (toAddr === UPGRADEABLE_CONTROLLER) {
      console.log(`  ⚠️  Controller: UPGRADEABLE (0x82c8...94C8) - NOT indexed by ENSNode`);
    } else if (toAddr === BASE_REGISTRAR.toLowerCase()) {
      console.log(`  ⚠️  Controller: DIRECT BaseRegistrar call`);
    } else {
      console.log(`  ❓ Controller: Unknown - ${tx.to}`);
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message || error}`);
  }
}

async function main() {
  console.log('=== Registration Controller Analysis ===');
  console.log('');
  console.log('Hypothesis: ENSNode only indexes registrations via Legacy Controller');
  console.log('  Legacy Controller:      0x49aE3cC2e3AA768B1e5654f5D3C6002144A59581');
  console.log('  Upgradeable Controller: 0x82c858CDF64b3D893Fe54962680edFDDC37e94C8');
  console.log('');
  console.log('--- INDEXED names (expecting Legacy Controller) ---');
  await findRegistrationTx('testname123');
  await findRegistrationTx('vitalik');
  await findRegistrationTx('coinbase');
  
  console.log('\n--- NOT INDEXED names (expecting Upgradeable Controller) ---');
  await findRegistrationTx('somasomasoma');
  await findRegistrationTx('scenius');
  await findRegistrationTx('estmcmxci');
  
  console.log('\n=== Analysis Complete ===');
}

main().catch(console.error);
