import { ethers } from "ethers";

export const lineaStateBridgeEventListener = async ({
  ethereumEndpoint,
  lineaStateBridgeAddress,
  l1MessageServiceAddress,
}) => {
  const provider = new ethers.JsonRpcProvider(ethereumEndpoint);

  const abi = [
    "event MessageSent(address indexed _from, address indexed _to, uint256 _fee, uint256 _value, uint256 _nonce, bytes _calldata, bytes32 indexed _messageHash)"
  ];

  const l1MessageServiceContract = new ethers.Contract(
    l1MessageServiceAddress,
    abi,
    provider
  );

  // Filter messages sent to lineaStateBridgeAddress
  const filter = l1MessageServiceContract.filters.MessageSent(lineaStateBridgeAddress);
  
  l1MessageServiceContract.on(filter, (_nonce, _calldata, _messageHash, event) => {
    console.log(`MessageSent Event Detected:`);
    console.log(`Message Hash: ${_messageHash}`);
    console.log(`Message Calldata: ${_calldata}`);
    console.log(`Message Nonce: ${_nonce}`);
    console.log(`Block Number: ${event.blockNumber}`);
    console.log(`Transaction Hash: ${event.transactionHash}`);
    console.log('---------------------------');
  });
};
