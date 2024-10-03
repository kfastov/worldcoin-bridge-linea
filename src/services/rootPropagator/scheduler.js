import cron from 'node-cron';
import config from './config.js';
import { propagateRoot, checkL2ContractState, setupTreeChangedListener } from './modules/L1/LineaRootPropagator.js';
import { listenForL1Messages } from './modules/L1/L1MessageListener.js';
import { setupL2EventPolling, claimL2Messages } from './modules/L2/L2MessageHandler.js';
import { createModuleLogger } from './utils/logger.js';

const logger = createModuleLogger('Scheduler');

export async function startScheduler() {
  try {
    // Start L1 message listener (runs continuously)
    logger.info('Starting L1 Message Listener...');
    await listenForL1Messages();

    // Start L2 event polling
    logger.info('Setting up L2 Event Polling...');
    await setupL2EventPolling();

    // Delay to ensure listeners are ready
    logger.info(`Waiting for listeners to initialize (${config.listenerInitDelay}ms)...`);
    await new Promise(resolve => setTimeout(resolve, config.listenerInitDelay));

    // Check L2 contract state and propagate root if necessary
    logger.info('Checking L2 contract state...');
    const shouldPropagateRoot = await checkL2ContractState();
    if (shouldPropagateRoot) {
      logger.info('Initial root is empty. Propagating root...');
      await propagateRoot();
    }

    // Set up TreeChanged event listener
    logger.info('Setting up TreeChanged event listener...');
    await setupTreeChangedListener();

    // Schedule L2 message confirmation (every 1 minute)
    cron.schedule('*/1 * * * *', async () => {
      logger.info('Claiming L2 messages...');
      await claimL2Messages();
    });

    logger.info('Scheduler started successfully');
  } catch (error) {
    logger.error('Error starting scheduler:', { error: error.message });
    throw error;
  }
}