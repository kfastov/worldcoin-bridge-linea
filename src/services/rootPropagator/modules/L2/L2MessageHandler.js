import { ethers } from 'ethers';
import { LineaSDK } from '@consensys/linea-sdk';
import config from '../../config.js';
import { getUnclaimedMessages, updateMessageStatus, deleteClaimedMessages } from '../../database.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('L2MessageHandler');

const abi = [
  "event L1L2MessageHashesAddedToInbox(bytes32[] messageHashes)"
];

let latestProcessedBlock = 0;

export async function setupL2EventPolling() {
  const provider = new ethers.JsonRpcProvider(config.l2RpcUrl);
  const l2MessageServiceContract = new ethers.Contract(config.l2MessageServiceAddress, abi, provider);

  // Process past events
  const latestBlock = await provider.getBlockNumber();
  const blocksToQuery = config.l2BlocksToQuery || 100000; // Default to 100,000 blocks if not specified
  const fromBlock = Math.max(0, latestBlock - blocksToQuery);
  logger.info(`Querying past L2 events from block ${fromBlock} to ${latestBlock}`);

  const filter = l2MessageServiceContract.filters.L1L2MessageHashesAddedToInbox();
  const pastEvents = await l2MessageServiceContract.queryFilter(filter, fromBlock, latestBlock);
  logger.info(`Found ${pastEvents.length} past L2 events`);

  for (const event of pastEvents) {
    await processEvent(event);
  }

  // Set the latest processed block after handling past events
  latestProcessedBlock = latestBlock;
  logger.info(`Processed past events up to block ${latestProcessedBlock}`);

  // Set up interval for polling new events
  setInterval(() => pollL2Events(provider, l2MessageServiceContract), config.l2PollingInterval);
}

async function pollL2Events(provider, l2MessageServiceContract) {
  try {
    const latestBlock = await provider.getBlockNumber();

    if (latestBlock <= latestProcessedBlock) {
      logger.debug('No new blocks to process');
      return;
    }

    logger.info(`Polling L2 events from block ${latestProcessedBlock + 1} to ${latestBlock}`);

    const filter = l2MessageServiceContract.filters.L1L2MessageHashesAddedToInbox();
    const events = await l2MessageServiceContract.queryFilter(filter, latestProcessedBlock + 1, latestBlock);

    for (const event of events) {
      await processEvent(event);
    }

    latestProcessedBlock = latestBlock;
    logger.info(`Processed events up to block ${latestProcessedBlock}`);
  } catch (error) {
    logger.error('Error polling L2 events', { error: error.message });
  }
}

async function processEvent(event) {
  const messageHashes = event.args.messageHashes;
  logger.info('Processing L1L2MessageHashesAddedToInbox Event:', {
    messageHashes,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash
  });

  try {
    await updateMessageStatuses(messageHashes);
  } catch (error) {
    logger.error('Error updating message statuses', { error: error.message });
  }
}

async function updateMessageStatuses(messageHashes) {
  const updatePromises = messageHashes.map(hash => 
    updateMessageStatus(hash, 'confirmed')
      .then(() => logger.info('Message status updated', { messageHash: hash }))
      .catch(error => logger.error('Failed to update status for message', { messageHash: hash, error: error.message }))
  );

  await Promise.all(updatePromises);
}

export async function claimL2Messages() {
  const lineaSDK = new LineaSDK({
    l2RpcUrl: config.l2RpcUrl,
    l2SignerPrivateKey: config.privateKey,
    network: config.lineaNetwork, // Use the network from config
    mode: "read-write",
  });

  const l2Contract = lineaSDK.getL2Contract(config.l2MessageServiceAddress);

  const unclaimedMessages = await getUnclaimedMessages();

  for (const message of unclaimedMessages) {
    try {
      logger.info('Claiming message', { messageHash: message.messageHash });

      const status = await l2Contract.getMessageStatus(message.messageHash);

      if (status === 'CLAIMED') {
        logger.info('Message already claimed', { messageHash: message.messageHash });
        await updateMessageStatus(message.messageHash, 'claimed');
        continue;
      } else if (status !== 'CLAIMABLE') {
        logger.error('Message status is not claimable', { messageHash: message.messageHash, status });
        continue;
      }

      const tx = await l2Contract.claim({
        messageSender: message.messageSender,
        destination: message.destination,
        fee: message.fee,
        value: message.value,
        messageNonce: message.nonce,
        calldata: message.calldata,
        messageHash: message.messageHash
      });

      await tx.wait();
      logger.info('Message claimed successfully', { messageHash: message.messageHash });
      await updateMessageStatus(message.messageHash, 'claimed');
    } catch (error) {
      if (error.message.includes('0x6650c4d1')) {
        logger.warn('Message claim failed due to CannotOverwriteRoot error', { messageHash: message.messageHash });
        await updateMessageStatus(message.messageHash, 'failed');
      } else {
        logger.error('Error claiming message', { messageHash: message.messageHash, error: error.message });
      }
    }
  }

  // Clean up claimed messages
  await deleteClaimedMessages();
}