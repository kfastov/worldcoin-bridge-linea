import { ethers } from "ethers";

export const listenForL1L2MessageHashesAddedToInbox = async ({
  lineaEndpoint,
  contractAddresses,
  knownMessageHashes,
}) => {
  // Connect to the Linea network
  const provider = new ethers.JsonRpcProvider(lineaEndpoint);

  const abi = ["event L1L2MessageHashesAddedToInbox(bytes32 indexed messageHashes)"];

  // Set up contracts
  const contracts = contractAddresses.map((address) => new ethers.Contract(address, abi, provider));

  contracts.forEach((contract) => {
    // Listen for L1L2MessageHashesAddedToInbox events
    contract.on("L1L2MessageHashesAddedToInbox", (messageHash) => {
      if (knownMessageHashes.includes(messageHash)) {
        console.log("Known message hash found:", messageHash);
      } else {
        console.log("New message hash:", messageHash);
      }
    });
  });
};
