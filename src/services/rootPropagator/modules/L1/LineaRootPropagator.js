import { ethers } from 'ethers';
import config from '../../config.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('LineaRootPropagator');

const LineaStateBridgeABI = [
  "function propagateRoot() external payable",
  "function latestRoot() public view returns (uint256)",
];

const WorldIDIdentityManagerABI = [
  "event TreeChanged(uint256 indexed preRoot, TreeChange indexed kind, uint256 indexed postRoot)",
];

const DEFAULT_LINEA_FEE = "0";

export async function checkL2ContractState() {
  const provider = new ethers.JsonRpcProvider(config.l2RpcUrl);
  const lineaStateBridge = new ethers.Contract(config.lineaStateBridgeAddress, LineaStateBridgeABI, provider);

  try {
    const latestRoot = await lineaStateBridge.latestRoot();
    logger.info(`Latest root in L2 contract: ${latestRoot}`);
    return latestRoot === ethers.ZeroHash;
  } catch (error) {
    logger.error('Error checking L2 contract state:', { error: error.message });
    throw error;
  }
}

export async function setupTreeChangedListener() {
  const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
  const worldIDIdentityManager = new ethers.Contract(config.worldIDIdentityManagerAddress, WorldIDIdentityManagerABI, provider);

  worldIDIdentityManager.on("TreeChanged", async (preRoot, kind, postRoot) => {
    logger.info('TreeChanged event detected', { preRoot, kind, postRoot });
    await propagateRoot();
  });

  logger.info('TreeChanged event listener set up successfully');
}

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