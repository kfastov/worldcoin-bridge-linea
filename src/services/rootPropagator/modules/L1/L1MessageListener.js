import { ethers } from 'ethers';
import config from '../../config.js';
import { saveMessage } from '../../database.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('L1MessageListener');

const abi = [
  "event MessageSent(address indexed _from, address indexed _to, uint256 _fee, uint256 _value, uint256 _nonce, bytes _calldata, bytes32 indexed _messageHash)"
];

export async function listenForL1Messages() {
  const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
  const l1MessageServiceContract = new ethers.Contract(config.l1MessageServiceAddress, abi, provider);

  const filter = l1MessageServiceContract.filters.MessageSent(config.lineaStateBridgeAddress);

  // Process past events
  const latestBlock = await provider.getBlockNumber();
  const blocksToQuery = config.l1BlocksToQuery || 100000; // Default to 100,000 blocks if not specified
  const fromBlock = Math.max(0, latestBlock - blocksToQuery);
  logger.info(`Querying past events from block ${fromBlock} to ${latestBlock}`);

  const pastEvents = await l1MessageServiceContract.queryFilter(filter, fromBlock, latestBlock);
  logger.info(`Found ${pastEvents.length} past events`);

  for (const event of pastEvents) {
    await processEvent(event);
  }

  // Set up listener for new events
  l1MessageServiceContract.on(filter, async (event) => {
    await processEvent(event);
  });

  logger.info('L1 Message Listener started for new events');
}

async function processEvent(event) {
  const [from, to, fee, value, nonce, calldata, messageHash] = event.args;
  logger.info('Processing MessageSent Event', {
    nonce,
    messageHash,
  });

  try {
    await saveMessage({
      messageSender: from,
      destination: to,
      messageHash: messageHash,
      nonce: nonce.toString(),
      fee: fee.toString(),
      value: value.toString(),
      calldata: calldata,
      status: 'pending',
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  } catch (error) {
    logger.error('Error saving message to database:', { error: error.message, messageHash });
  }
}