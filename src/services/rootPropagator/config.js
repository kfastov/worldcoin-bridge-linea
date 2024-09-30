import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const config = {
  propagationPeriod: parseInt(process.env.PROPAGATION_PERIOD) || 3600000, // Default to 1 hour
  listenerInitDelay: parseInt(process.env.LISTENER_INIT_DELAY) || 5000, // Default to 5 seconds
  privateKey: process.env.PRIVATE_KEY,
  l1RpcUrl: process.env.L1_RPC_URL,
  l2RpcUrl: process.env.L2_RPC_URL,
  lineaStateBridgeAddress: process.env.LINEA_STATE_BRIDGE_ADDRESS,
  l1MessageServiceAddress: process.env.L1_MESSAGE_SERVICE_ADDRESS,
  l2MessageServiceAddress: process.env.L2_MESSAGE_SERVICE_ADDRESS,
};

export function validateConfig() {
  const requiredFields = [
    'privateKey',
    'l1RpcUrl',
    'l2RpcUrl',
    'lineaStateBridgeAddress',
    'l1MessageServiceAddress',
    'l2MessageServiceAddress',
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }

  // Validate Ethereum addresses
  const addressFields = ['lineaStateBridgeAddress', 'l1MessageServiceAddress', 'l2MessageServiceAddress'];
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