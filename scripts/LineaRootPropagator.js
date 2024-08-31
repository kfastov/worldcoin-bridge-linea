const ethers = require('ethers');
const { LineaSDK } = require('@consensys/linea-sdk');

const LineaStateBridgeABI = [
  "function propagateRoot() external payable",
];

const DEFAULT_LINEA_FEE = "0.001";

class LineaRootPropagator {
  constructor(config) {
    this.config = config;
    this.initializeProvider();
    this.lineaStateBridge = new ethers.Contract(config.lineaStateBridgeAddress, LineaStateBridgeABI, this.wallet);
    this.propagationPeriod = config.propagationPeriod || 3600; // Default to 1 hour
    this.lineaSdk = new LineaSDK({ provider: this.provider });
    this.maxRetries = config.maxRetries || 3;
    this.rpcTimeout = config.rpcTimeout || 10000; // 10 seconds default timeout
  }

  initializeProvider() {
    this.provider = new ethers.providers.JsonRpcProvider(this.config.getRpcUrl(), undefined, { timeout: this.rpcTimeout });
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
  }

  async getGasPrice() {
    return await this.provider.getGasPrice();
  }

  async propagateRoot() {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        console.log('Starting root propagation process...');
        const gasPrice = await this.getGasPrice();
        console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`);

        console.log('Estimating gas...');

        const fee = ethers.utils.parseUnits(DEFAULT_LINEA_FEE, "ether");
        const gasLimit = await this.lineaStateBridge.estimateGas.propagateRoot({
          gasPrice: gasPrice,
          value: fee
        });
        console.log(`Estimated gas limit: ${gasLimit.toString()}`);

        console.log('Sending propagateRoot transaction...');
        const tx = await this.lineaStateBridge.propagateRoot({
          gasLimit: gasLimit.mul(12).div(10), // Add 20% buffer
          gasPrice: gasPrice,
          value: fee
        });
        console.log(`Transaction sent. Hash: ${tx.hash}`);
        
        console.log('Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log(`Root propagated successfully. Transaction hash: ${receipt.transactionHash}`);
        return;
      } catch (error) {
        if (error.code === 'INSUFFICIENT_FUNDS') {
          console.log('Error propagating root: Insufficient funds for gas. Please check your wallet balance.');
          return;
        }
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
          console.log('Insufficient Linea fee, please modify DEFAULT_LINEA_FEE value');
          this.stop();
          return;
        }
        if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
          console.log('RPC timeout detected. Switching to next RPC URL...');
          this.initializeProvider();
          this.lineaStateBridge = new ethers.Contract(this.config.lineaStateBridgeAddress, LineaStateBridgeABI, this.wallet);
          retries++;
        } else {
          console.error('Unhandled error. Stopping propagation attempts.');
          this.stop();
          return;
        }
      }
    }
    console.error(`Failed to propagate root after ${this.maxRetries} attempts.`);
  }

  async start() {
    console.log(`Starting root propagation cycle every ${this.propagationPeriod} seconds...`);
    this.interval = setInterval(() => this.propagateRoot(), this.propagationPeriod * 1000);
    // Trigger first propagation immediately
    await this.propagateRoot();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('Root propagation stopped.');
    } else {
      console.log('No active propagation cycle to stop.');
    }
  }
}

module.exports = LineaRootPropagator;