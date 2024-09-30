import { ethers } from 'ethers';
import { LineaSDK } from '@consensys/linea-sdk';
import config from '../../config.js';
import { getUnconfirmedMessages, updateMessageStatus, deleteConfirmedMessages } from '../../database.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('L2MessageHandler');

const abi = [
  "event L1L2MessageHashesAddedToInbox(bytes32[] messageHashes)"
];

export function listenForL2Messages() {
  const provider = new ethers.JsonRpcProvider(config.l2RpcUrl);
  const l2MessageServiceContract = new ethers.Contract(config.l2MessageServiceAddress, abi, provider);

  l2MessageServiceContract.on("L1L2MessageHashesAddedToInbox", async (messageHashes) => {
    logger.info('New message hashes received on L2', { messageHashes });
    try {
      // Update all message statuses in a batch
      await updateMessageStatuses(messageHashes);
    } catch (error) {
      logger.error('Error updating message statuses', { error: error.message });
    }
  });

  logger.info('L2 Message Listener started');
}

async function updateMessageStatuses(messageHashes) {
  const updatePromises = messageHashes.map(hash => 
    updateMessageStatus(hash, 'confirmed')
      .then(() => logger.info('Message status updated', { messageHash: hash }))
      .catch(error => logger.error('Failed to update status for message', { messageHash: hash, error: error.message }))
  );

  await Promise.all(updatePromises);
}

export async function confirmL2Messages() {
  const lineaSDK = new LineaSDK({
    l2RpcUrl: config.l2RpcUrl,
    l2SignerPrivateKey: config.privateKey,
    network: "linea-mainnet",
    mode: "read-write",
  });

  const l2Contract = lineaSDK.getL2Contract(config.l2MessageServiceAddress);

  const unconfirmedMessages = await getUnconfirmedMessages();

  for (const message of unconfirmedMessages) {
    try {
      const tx = await l2Contract.claim({
        messageSender: config.lineaStateBridgeAddress,
        destination: config.l2MessageServiceAddress,
        fee: "0", // Assuming no fee for now
        value: "0", // Assuming no value transfer
        messageNonce: message.nonce,
        calldata: message.calldata,
        messageHash: message.messageHash
      });

      await tx.wait();
      logger.info('Message confirmed successfully', { messageHash: message.messageHash });
      await updateMessageStatus(message.messageHash, 'confirmed');
    } catch (error) {
      logger.error('Error confirming message', { messageHash: message.messageHash, error: error.message });
    }
  }

  // Clean up confirmed messages
  await deleteConfirmedMessages();
}