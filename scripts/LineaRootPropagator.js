// src/script/LineaRootPropagator.js

const ethers = require('ethers');
const { LineaSDK } = require('@consensys/linea-sdk');

const LineaStateBridgeABI = [
  "function propagateRoot() external payable",
  "function setFeePropagateRoot(uint256 _fee) external",
  "function getFeePropagateRoot() external view returns (uint256)"
];

class LineaRootPropagator {
  constructor(config) {
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.lineaStateBridge = new ethers.Contract(config.lineaStateBridgeAddress, LineaStateBridgeABI, this.wallet);
    this.propagationPeriod = config.propagationPeriod || 3600000; // Default to 1 hour
    this.lineaSdk = new LineaSDK({ provider: this.provider });
  }

  async setFeePropagateRoot(fee) {
    try {
      console.log(`Attempting to set fee to ${fee} ETH...`);
      const tx = await this.lineaStateBridge.setFeePropagateRoot(ethers.utils.parseEther(fee.toString()));
      console.log(`Transaction sent. Waiting for confirmation...`);
      await tx.wait();
      console.log(`Fee successfully set to ${fee} ETH`);
    } catch (error) {
      console.error('Error setting fee:', error.message);
      if (error.transaction) {
        console.error('Failed transaction details:', error.transaction);
      }
    }
  }

  async propagateRoot() {
    try {
      console.log('Starting root propagation process...');
      
      console.log('Fetching current propagation fee...');
      const fee = await this.lineaStateBridge.getFeePropagateRoot();
      console.log(`Current propagation fee: ${ethers.utils.formatEther(fee)} ETH`);
      
      console.log('Sending propagateRoot transaction...');
      const tx = await this.lineaStateBridge.propagateRoot({ value: fee });
      console.log(`Transaction sent. Hash: ${tx.hash}`);
      
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log(`Root propagated successfully. Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
      console.error('Error propagating root:', error.message);
      if (error.transaction) {
        console.error('Failed transaction details:', error.transaction);
      }
    }
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