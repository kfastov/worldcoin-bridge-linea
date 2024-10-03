import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';

// Load environment-specific file if ENVIRONMENT is set
if (process.env.ENVIRONMENT) {
  const envFile = `${process.env.ENVIRONMENT}.env`;
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

dotenv.config();

const config = {
  propagationPeriod: parseInt(process.env.PROPAGATION_PERIOD) || 3600000, // Default to 1 hour
  listenerInitDelay: parseInt(process.env.LISTENER_INIT_DELAY) || 5000, // Default to 5 seconds
  l1BlocksToQuery: parseInt(process.env.L1_BLOCKS_TO_QUERY) || 100000, // Default to 100,000 blocks
  l2BlocksToQuery: parseInt(process.env.L2_BLOCKS_TO_QUERY) || 100000, // Default to 100,000 blocks
  privateKey: process.env.PRIVATE_KEY,
  l1RpcUrl: process.env.ETH_RPC_URL,
  l2RpcUrl: process.env.LINEA_RPC_URL,
  lineaStateBridgeAddress: process.env.LINEA_STATE_BRIDGE_ADDRESS,
  l1MessageServiceAddress: process.env.MESSAGE_SERVICE_ADDRESS_L1,
  l2MessageServiceAddress: process.env.MESSAGE_SERVICE_ADDRESS_L2,
  l2PollingInterval: parseInt(process.env.L2_POLLING_INTERVAL) || 30000, // Default to 30 seconds
  worldIDIdentityManagerAddress: process.env.WORLD_ID_IDENTITY_MANAGER_ADDRESS,
  lineaWorldIDAddress: process.env.LINEA_WORLD_ID_ADDRESS,
};

export function validateConfig() {
  const requiredFields = [
    'privateKey',
    'l1RpcUrl',
    'l2RpcUrl',
    'lineaStateBridgeAddress',
    'l1MessageServiceAddress',
    'l2MessageServiceAddress',
    'worldIDIdentityManagerAddress',
    'lineaWorldIDAddress',
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }

  // Validate Ethereum addresses
  const addressFields = ['lineaStateBridgeAddress', 'l1MessageServiceAddress', 'l2MessageServiceAddress', 'worldIDIdentityManagerAddress', 'lineaWorldIDAddress'];
  for (const field of addressFields) {
    if (!ethers.isAddress(config[field])) {
      throw new Error(`Invalid Ethereum address for ${field}: ${config[field]}`);
    }
  }

  // Validate RPC URLs
  const urlFields = ['l1RpcUrl', 'l2RpcUrl'];
  for (const field of urlFields) {
    try {
      new URL(config[field]);
    } catch (error) {
      throw new Error(`Invalid URL for ${field}: ${config[field]}`);
    }
  }

  console.log('Configuration validated successfully');
}

export default config;