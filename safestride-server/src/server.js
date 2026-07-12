'use strict';

/**
 * server.js — updated in F-19
 * Starts Bull queue processors and cleanup jobs after server init.
 */

require('dotenv').config();

const http   = require('http');
const app    = require('./app');
const config = require('./config/environment');

const { connectDB, disconnectDB }       = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { initSocketIO }                  = require('./sockets');
const { registerJobProcessors }         = require('./jobs/notification.job');
const { startCleanupJobs }             = require('./jobs/cleanup.job');
const {
  criticalQueue,
  highQueue,
  closeAllQueues,
}                                       = require('./jobs/queue');

// Print startup banner
console.log('\n╔═══════════════════════════════════════╗');
console.log('║         SafeStride  v1.0.0            ║');
console.log('╚═══════════════════════════════════════╝');
console.log(`  Environment : ${config.env}`);
console.log(`  Port        : ${config.port}\n`);

const server = http.createServer(app);

async function bootstrap() {
  try {
    // Step 1: Database connections
    await connectDB();
    await connectRedis();

    // Step 2: Socket.io
    initSocketIO(server);

    // Step 3: Bull queue processors (F-19)
    registerJobProcessors({ criticalQueue, highQueue });

    // Step 4: Cleanup jobs (F-19)
    startCleanupJobs();

    // Step 5: Start HTTP server
    server.listen(config.port, () => {
      console.log(`✔  HTTP server listening on port ${config.port}`);
      console.log(`  SafeStride is ready to accept requests.`);
      console.log(`  Health check → http://localhost:${config.port}/health\n`);
    });
  } catch (err) {
    console.error('\n✖  Bootstrap failed:', err.message);
    console.error('   SafeStride cannot start. Fix the error above and retry.\n');
    process.exit(1);
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(async () => {
    try {
      await closeAllQueues();
      await disconnectDB();
      await disconnectRedis();
      console.log('✔  SafeStride server stopped cleanly.');
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
  setTimeout(() => { console.error('✖  Forced shutdown'); process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('✖  Uncaught Exception:', err.message);
  if (config.isDev) console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('✖  Unhandled Rejection:', reason);
});

bootstrap();
module.exports = server;