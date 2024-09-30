import cron from 'node-cron';
import config from './config.js';
import { propagateRoot } from './modules/L1/LineaRootPropagator.js';
import { listenForL1Messages } from './modules/L1/L1MessageListener.js';
import { listenForL2Messages, confirmL2Messages } from './modules/L2/L2MessageHandler.js';
import { createModuleLogger } from './utils/logger.js';

const logger = createModuleLogger('Scheduler');

export async function startScheduler() {
  // Start L1 message listener (runs continuously)
  logger.info('Starting L1 Message Listener...');
  await listenForL1Messages();

  // Start L2 message listener (runs continuously)
  logger.info('Starting L2 Message Listener...');
  listenForL2Messages();

  // Delay the first root propagation to ensure listeners are ready
  logger.info(`Waiting for listeners to initialize (${config.listenerInitDelay}ms)...`);
  await new Promise(resolve => setTimeout(resolve, config.listenerInitDelay));

  // Execute initial root propagation
  logger.info('Executing initial root propagation...');
  await propagateRoot();

  // Schedule subsequent root propagations
  const propagationPeriodMinutes = Math.floor(config.propagationPeriod / 60000);
  cron.schedule(`*/${propagationPeriodMinutes} * * * *`, async () => {
    logger.info('Executing scheduled root propagation...');
    await propagateRoot();
  });

  // Schedule L2 message confirmation (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Confirming L2 messages...');
    await confirmL2Messages();
  });

  logger.info('Scheduler started successfully');
}