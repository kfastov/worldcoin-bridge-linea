import { validateConfig } from './config.js';
import { connectToDatabase } from './database.js';
import { startScheduler } from './scheduler.js';
import { createModuleLogger } from './utils/logger.js';

const logger = createModuleLogger('App');

async function main() {
  try {
    // Validate configuration
    validateConfig();

    // Connect to the database
    await connectToDatabase();

    // Start the scheduler (now awaiting it)
    await startScheduler();

    logger.info('Root Propagator service started successfully');
  } catch (error) {
    logger.error('Failed to start Root Propagator service:', { error: error.message });
    process.exit(1);
  }
}

main();

process.on('SIGINT', () => {
  logger.info('Shutting down Root Propagator service...');
  process.exit();
});