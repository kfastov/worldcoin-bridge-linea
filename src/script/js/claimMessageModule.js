import { ethers } from 'ethers';
import { LineaSDK } from '@consensys/linea-sdk';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Securely read the private key from the environment variable
const privateKey = process.env.L2_SIGNER_PRIVATE_KEY;
if (!privateKey) {
    throw new Error('Private key not found in environment variables');
}

// Initialize the Linea SDK
const lineaSDK = new LineaSDK({
  l2RpcUrl: process.env.L2_RPC_URL ?? "",
  l2SignerPrivateKey: process.env.L2_SIGNER_PRIVATE_KEY ?? "",
  network: "linea-mainnet",
  mode: "read-write",
});

async function claimPendingMessage(sender, destination, fee, value, messageHash, nonce, calldata, l2MessageServiceAddress) {
    try {
      const l2Contract = lineaSDK.getL2Contract(l2MessageServiceAddress);

      const message = {
        messageSender: sender,
        destination: destination,
        fee: fee,
        value: value,
        messageNonce: nonce,
        calldata: calldata,
        messageHash: messageHash
      }

      const tx = await l2Contract.claim(message);
      await tx.wait();
      console.log('Message claimed successfully:', tx.hash);
      return tx;

    } catch (error) {
        console.error('Error claiming message:', error);
        throw error; // Re-throw the error after logging it
    }
}

// Export the module functions
export { claimPendingMessage };
