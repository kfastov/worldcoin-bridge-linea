import { ethers } from "ethers";

export const lineaStateBridgeEventListener = async ({
  ethereumEndpoint,
  lineaStateBridgeAddress,
  l1MessageServiceAddress,
}) => {
  let provider;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 5000; // 5 seconds delay between reconnection attempts

  const initializeProvider = () => {
    provider = new ethers.providers.JsonRpcProvider(ethereumEndpoint);

    // Listen for provider events
    provider.on('connect', () => {
      console.log('Connected to the Ethereum network.');
      reconnectAttempts = 0; // Reset attempts on successful connection
    });

    provider.on('error', (error) => {
      console.error('Network error:', error);
    });

    provider.on('disconnect', (error) => {
      console.error('Disconnected from the Ethereum network:', error);
      handleReconnection();
    });
  };

  // Function to handle reconnection
  const handleReconnection = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        initializeProvider();
        listenForEvents(); // Reattach event listeners after reconnection
      }, RECONNECT_DELAY);
    } else {
      console.error('Max reconnection attempts reached. Exiting...');
      process.exit(1); // Exit process after max attempts
    }
  };

  // Function to listen for events
  const listenForEvents = () => {
    // Event ABI
    const abi = ["event MessageSent (uint256 _nonce, bytes _calldata, index_topic_3 bytes32 _messageHash)"];

    const lineaStateBridgeContract = new ethers.Contract(
      lineaStateBridgeAddress,
      abi,
      provider
    );

    // Filter messages sent to l1MessageServiceAddress
    filter = lineaStateBridgeContract.filters.MessageSent(l1MessageServiceAddress);

    lineaStateBridgeContract.on(filter, (_nonce, _calldata, _messageHash, event) => {
      console.log(`MessageSent Event Detected:`);
      console.log(`Message Hash: ${_messageHash}`);
      console.log(`Message Calldata: ${_calldata}`);
      console.log(`Message Nonce: ${_nonce}`);
      console.log(`Block Number: ${event.blockNumber}`);
      console.log(`Transaction Hash: ${event.transactionHash}`);
      console.log('---------------------------');
    });

    console.log('Listening for MessageSent events...');
  };

  initializeProvider();
  listenForEvents();
};
