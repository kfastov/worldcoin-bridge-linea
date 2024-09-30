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
  
  l1MessageServiceContract.on(filter, async (payload) => {
    logger.info(`MessageSent Event Detected:`);
    const [_from, _to, _fee, _value, nonce, calldata, messageHash] = payload.args;
    logger.info(`Message details`, {
      nonce,
      messageHash,
      calldata,
      blockNumber: payload.log.blockNumber,
      transactionHash: payload.log.transactionHash
    });

    try {
      await saveMessage({
        messageHash: messageHash,
        nonce: nonce,
        calldata: calldata,
      });
    } catch (error) {
      logger.error('Error saving message to database:', { error: error.message });
    }
  });

  logger.info('L1 Message Listener started');
}