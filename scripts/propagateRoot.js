const path = require('path');
const LineaRootPropagator = require('./LineaRootPropagator');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('address', {
    alias: 'a',
    type: 'string',
    description: 'LineaStateBridge address'
  })
  .option('period', {
    alias: 'p',
    type: 'number',
    description: 'Propagation period in milliseconds'
  })
  .option('rpc', {
    alias: 'r',
    type: 'string',
    description: 'RPC URL'
  })
  .help()
  .alias('help', 'h')
  .argv;

const config = {
  rpcUrl: argv.rpc || process.env.RPC_URL || 'https://rpc-sepolia.rockx.com',
  lineaStateBridgeAddress: argv.address || process.env.LINEA_STATE_BRIDGE_ADDRESS,
  propagationPeriod: argv.period || parseInt(process.env.PROPAGATION_PERIOD) || 3600000, 
  privateKey: process.env.PRIVATE_KEY
};

if (!config.privateKey) {
  console.error('PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

if (!config.lineaStateBridgeAddress) {
  console.error('LineaStateBridge address not provided. Use --address option or set LINEA_STATE_BRIDGE_ADDRESS environment variable.');
  process.exit(1);
}

const propagator = new LineaRootPropagator(config);

async function main() {
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