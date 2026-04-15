'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * ProductTraceability Chaincode
 * Equivalent to the Solidity ProductTraceability.sol contract
 * Records supply chain events on Hyperledger Fabric
 */
class ProductTraceability extends Contract {

  /**
   * Initialize the ledger (optional)
   */
  async initLedger(ctx) {
    console.log('=== ProductTraceability Chaincode Initialized ===');
    return JSON.stringify({ success: true, message: 'Chaincode initialized' });
  }

  /**
   * Record a product supply chain event
   * Equivalent to recordEvent() in Solidity
   * 
   * @param {Context} ctx - Transaction context
   * @param {string} batchId - Batch identifier
   * @param {string} actorAddress - Actor wallet/identity address
   * @param {string} eventType - Event type (1=Harvest, 2=Certification, 3=Shipment, 4=Processing, 5=Received, 99=Benchmark)
   * @param {string} ipfsHash - IPFS hash of event data
   */
  async recordEvent(ctx, batchId, actorAddress, eventType, ipfsHash) {
    const timestamp = ctx.stub.getTxTimestamp();
    const txId = ctx.stub.getTxID();
    const txTimestamp = new Date(timestamp.seconds.low * 1000).toISOString();

    // Create event record
    const eventRecord = {
      docType: 'productEvent',
      batchId,
      actorAddress,
      eventType: parseInt(eventType),
      ipfsHash,
      txId,
      timestamp: txTimestamp,
      createdAt: new Date().toISOString()
    };

    // Store in world state with composite key: EVENT_{batchId}_{txId}
    const key = `EVENT_${batchId}_${txId}`;
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(eventRecord)));

    // Also update latest IPFS hash for this batch
    const latestKey = `LATEST_${batchId}`;
    await ctx.stub.putState(latestKey, Buffer.from(JSON.stringify({
      batchId,
      ipfsHash,
      lastEventType: parseInt(eventType),
      lastTxId: txId,
      updatedAt: txTimestamp
    })));

    // Emit event (Fabric uses setEvent for events)
    ctx.stub.setEvent('ProductEvent', Buffer.from(JSON.stringify({
      batchId,
      actorAddress,
      eventType: parseInt(eventType),
      ipfsHash,
      txId,
      timestamp: txTimestamp
    })));

    console.log(`✅ Event recorded: batch=${batchId}, type=${eventType}, tx=${txId}`);

    return JSON.stringify(eventRecord);
  }

  /**
   * Get latest IPFS hash for a batch
   * Equivalent to getLatestIpfsHash() in Solidity
   */
  async getLatestIpfsHash(ctx, batchId) {
    const key = `LATEST_${batchId}`;
    const data = await ctx.stub.getState(key);
    
    if (!data || data.length === 0) {
      return JSON.stringify({ batchId, ipfsHash: '', found: false });
    }

    return data.toString();
  }

  /**
   * Query all events for a batch
   */
  async queryEventsByBatch(ctx, batchId) {
    const startKey = `EVENT_${batchId}_`;
    const endKey = `EVENT_${batchId}_~`;
    
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      const record = JSON.parse(result.value.value.toString());
      results.push(record);
      result = await iterator.next();
    }

    return JSON.stringify(results);
  }

  /**
   * Benchmark test — simple write for performance testing
   */
  async benchmarkWrite(ctx, key, value) {
    const txId = ctx.stub.getTxID();
    const timestamp = ctx.stub.getTxTimestamp();
    
    const record = {
      docType: 'benchmark',
      key,
      value,
      txId,
      timestamp: new Date(timestamp.seconds.low * 1000).toISOString()
    };

    await ctx.stub.putState(`BENCH_${key}`, Buffer.from(JSON.stringify(record)));
    
    return JSON.stringify({ txId, success: true });
  }
}

module.exports = ProductTraceability;
