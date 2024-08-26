const ethers = require('ethers');
const { LineaSDK } = require('@consensys/linea-sdk');

const LineaStateBridgeABI = [
  "function propagateRoot() external payable",
];

class LineaRootPropagator {
  constructor(config) {
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.lineaStateBridge = new ethers.Contract(config.lineaStateBridgeAddress, LineaStateBridgeABI, this.wallet);
    this.propagationPeriod = config.propagationPeriod || 3600000; // Default to 1 hour
    this.lineaSdk = new LineaSDK({ provider: this.provider });
    this.maxRetries = config.maxRetries || 3;
    this.gasMultiplier = config.gasMultiplier || 1.5;
  }

  async getGasPrice() {
    const gasPrice = await this.provider.getGasPrice();
    return gasPrice.mul(Math.floor(this.gasMultiplier * 100)).div(100);
  }

  async propagateRoot() {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        console.log('Starting root propagation process...');
        const gasPrice = await this.getGasPrice();
        console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`);

        console.log('Estimating gas...');
        const gasLimit = await this.lineaStateBridge.estimateGas.propagateRoot({
          gasPrice: gasPrice
        });
        console.log(`Estimated gas limit: ${gasLimit.toString()}`);

        console.log('Sending propagateRoot transaction...');
        const tx = await this.lineaStateBridge.propagateRoot({
          gasLimit: gasLimit.mul(12).div(10), // Add 20% buffer
          gasPrice: gasPrice
        });
        console.log(`Transaction sent. Hash: ${tx.hash}`);
        
        console.log('Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log(`Root propagated successfully. Transaction hash: ${receipt.transactionHash}`);
        return;
      } catch (error) {
        console.error('Error propagating root:', error.message);
        if (error.code === 'INSUFFICIENT_FUNDS') {
          console.log('Insufficient funds for gas. Please check your wallet balance.');
          return;
        }
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || error.message.includes('transaction underpriced')) {
          retries++;
          console.log(`Retry attempt ${retries}/${this.maxRetries}`);
          this.gasMultiplier *= 1.2; // Increase gas price by 20% for each retry
          await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for 15 seconds before retrying
        } else {
          console.error('Unhandled error. Stopping propagation attempts.');
          return;
        }
      }
    }
    console.error(`Failed to propagate root after ${this.maxRetries} attempts.`);
  }

  async start() {
    console.log(`Starting root propagation cycle every ${this.propagationPeriod / 1000} seconds...`);
    this.interval = setInterval(() => this.propagateRoot(), this.propagationPeriod);
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