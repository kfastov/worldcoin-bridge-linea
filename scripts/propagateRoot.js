// src/script/propagateRoot.js

const fs = require('fs');
const path = require('path');
const LineaRootPropagator = require('./LineaRootPropagator');

// Read configuration
const configPath = path.join(__dirname, '..', '/src/script', '.deploy-script.json');
const deployConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.linea.build',
  lineaStateBridgeAddress: deployConfig.lineaStateBridgeAddress,
  propagationPeriod: parseInt(process.env.PROPAGATION_PERIOD) || 3600000, 
  privateKey: process.env.PRIVATE_KEY
};

if (!config.privateKey) {
  console.error('PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const propagator = new LineaRootPropagator(config);

async function main() {
  // Set the fee if needed 
  // await propagator.setFeePropagateRoot(0.001);

  await propagator.start();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

process.on('SIGINT', () => {
  propagator.stop();
  process.exit();
});