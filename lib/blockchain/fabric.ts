/**
 * Hyperledger Fabric SDK Integration
 * Connects to Fabric network for benchmark transactions
 * 
 * Uses fabric-gateway (gRPC) for Fabric 2.5+
 * or falls back to Docker CLI exec for simpler setup
 */

import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ============================================================
// Configuration
// ============================================================
const FABRIC_CONFIG = {
  peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
  ordererEndpoint: process.env.FABRIC_ORDERER_ENDPOINT || 'localhost:7050',
  channelName: process.env.FABRIC_CHANNEL || 'bosfresh-channel',
  chaincodeName: process.env.FABRIC_CHAINCODE || 'product-traceability',
  mspId: 'Org1MSP',
  // Path to crypto materials (relative to network/fabric/)
  cryptoPath: process.env.FABRIC_CRYPTO_PATH || 'network/fabric/crypto-config',
};

// ============================================================
// Transaction via Docker CLI (Most reliable method)
// ============================================================

/**
 * Send a transaction to Fabric via the CLI container
 * This avoids needing fabric-gateway npm package and complex gRPC setup
 */
export async function sendFabricTransaction(
  functionName: string,
  args: string[]
): Promise<{ txId: string; success: boolean; latencyMs: number; result?: string }> {
  const start = Date.now();

  try {
    const argsJson = JSON.stringify({
      function: functionName,
      Args: args
    });

    const caFile = '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bosfresh.com/orderers/orderer.bosfresh.com/msp/tlscacerts/tlsca.bosfresh.com-cert.pem';
    const command = `peer chaincode invoke -o orderer.bosfresh.com:7050 --tls --cafile ${caFile} -C ${FABRIC_CONFIG.channelName} -n ${FABRIC_CONFIG.chaincodeName} -c "$CORE_PEER_ARGS" --waitForEvent`;

    const dockerArgs = [
      'exec', '-e', `CORE_PEER_ARGS=${argsJson}`, 'fabric-cli', 'bash', '-c', command
    ];

    // First invoke may take 60-120s due to chaincode container build
    const { stdout, stderr } = await execFileAsync('docker', dockerArgs, { timeout: 120000 });
    const end = Date.now();

    // Parse txId from output
    const txIdMatch = (stdout + stderr).match(/txid \[([a-f0-9]+)\]/i);
    const txId = txIdMatch ? txIdMatch[1] : `fabric-${Date.now()}`;

    const isSuccess = !(stdout + stderr).toLowerCase().includes('error');

    return {
      txId,
      success: isSuccess,
      latencyMs: end - start,
      result: stdout.trim()
    };
  } catch (error: any) {
    const end = Date.now();
    console.error(`❌ Fabric TX failed:`);
    console.error(error.message);
    if (error.stdout) console.error(`Stdout: ${error.stdout}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr}`);

    return {
      txId: `failed-${Date.now()}`,
      success: false,
      latencyMs: end - start
    };
  }
}

/**
 * Warmup: triggers chaincode container build so benchmarks don't include build time
 */
export async function warmupFabricChaincode(): Promise<void> {
  console.log('  🔥 Warming up Fabric chaincode container...');
  try {
    await sendFabricTransaction('benchmarkWrite', ['warmup', 'warmup']);
    console.log('  ✅ Fabric chaincode container is ready');
  } catch (e) {
    console.warn('  ⚠️ Fabric warmup failed (may still work)');
  }
}

/**
 * Send a benchmark write transaction to Fabric
 */
export async function sendFabricBenchmarkTx(index: number): Promise<{
  txId: string;
  success: boolean;
  latencyMs: number;
}> {
  const key = `bench-${Date.now()}-${index}`;
  const value = JSON.stringify({
    index,
    timestamp: new Date().toISOString(),
    type: 'benchmark'
  });

  return sendFabricTransaction('benchmarkWrite', [key, value]);
}

/**
 * Send a recordEvent transaction to Fabric (mirrors Solidity contract)
 */
export async function sendFabricRecordEvent(
  batchId: string,
  actorAddress: string,
  eventType: number,
  ipfsHash: string
): Promise<{ txId: string; success: boolean; latencyMs: number }> {
  return sendFabricTransaction('recordEvent', [
    batchId,
    actorAddress,
    eventType.toString(),
    ipfsHash
  ]);
}

/**
 * Query Fabric chaincode (read-only)
 */
export async function queryFabric(
  functionName: string,
  args: string[]
): Promise<any> {
  try {
    const argsJson = JSON.stringify({
      function: functionName,
      Args: args
    });

    const command = `peer chaincode query -C ${FABRIC_CONFIG.channelName} -n ${FABRIC_CONFIG.chaincodeName} -c "$CORE_PEER_ARGS"`;

    const dockerArgs = [
      'exec', '-e', `CORE_PEER_ARGS=${argsJson}`, 'fabric-cli', 'bash', '-c', command
    ];

    const { stdout } = await execFileAsync('docker', dockerArgs, { timeout: 10000 });
    return JSON.parse(stdout.trim());
  } catch (error: any) {
    console.error(`❌ Fabric query failed:`);
    console.error(error.message);
    if (error.stdout) console.error(`Stdout: ${error.stdout}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr}`);
    return null;
  }
}

/**
 * Check if Fabric network is running
 */
export async function isFabricRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'docker ps --format "{{.Names}}" | findstr fabric-cli',
      { timeout: 5000 }
    );
    return stdout.trim().includes('fabric-cli');
  } catch {
    return false;
  }
}

/**
 * Get Fabric network info
 */
export async function getFabricNetworkInfo(): Promise<{
  running: boolean;
  peers: number;
  channel: string;
  chaincode: string;
}> {
  const running = await isFabricRunning();

  if (!running) {
    return {
      running: false,
      peers: 0,
      channel: FABRIC_CONFIG.channelName,
      chaincode: FABRIC_CONFIG.chaincodeName
    };
  }

  try {
    const { stdout } = await execAsync(
      'docker ps --format "{{.Names}}" | findstr peer',
      { timeout: 5000 }
    );
    const peers = stdout.trim().split('\n').filter(s => s.includes('peer')).length;

    return {
      running: true,
      peers,
      channel: FABRIC_CONFIG.channelName,
      chaincode: FABRIC_CONFIG.chaincodeName
    };
  } catch {
    return {
      running: true,
      peers: 0,
      channel: FABRIC_CONFIG.channelName,
      chaincode: FABRIC_CONFIG.chaincodeName
    };
  }
}
