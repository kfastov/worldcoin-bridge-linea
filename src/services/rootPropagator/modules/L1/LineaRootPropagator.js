import { ethers } from 'ethers';
import config from '../../config.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('LineaRootPropagator');

const LineaStateBridgeABI = [
  "function propagateRoot() external payable",
];

const DEFAULT_LINEA_FEE = "0";

export async function propagateRoot() {
  const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const lineaStateBridge = new ethers.Contract(config.lineaStateBridgeAddress, LineaStateBridgeABI, wallet);

  try {
    logger.info('Starting root propagation process...');
    const feeData = await provider.getFeeData();
    logger.info(`Current gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei`);

    logger.info('Estimating gas...');
    const fee = ethers.parseEther(DEFAULT_LINEA_FEE);
    const gasLimit = await lineaStateBridge.propagateRoot.estimateGas({ value: fee });
    logger.info(`Estimated gas limit: ${gasLimit.toString()}`);

    logger.info('Sending propagateRoot transaction...');
    const tx = await lineaStateBridge.propagateRoot({
      gasLimit: gasLimit,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      value: fee
    });
    logger.info(`Transaction sent. Hash: ${tx.hash}`);
    
    logger.info('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    logger.info(`Root propagated successfully. Transaction hash: ${receipt.hash}`);
  } catch (error) {
    logger.error('Error propagating root:', { error: error.message });
    throw error;
  }
}