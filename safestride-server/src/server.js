'use strict';

/**
 * server.js — updated in F-11
 * Adds Socket.io initialization after Express server starts.
 */

require('dotenv').config();

const http   = require('http');
const app    = require('./app');
const config = require('./config/environment');

const { connectDB, disconnectDB }       = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { initSocketIO }                  = require('./sockets');

const server = http.createServer(app);

async function bootstrap() {
  try {
    // Step 1: Database connections
    await connectDB();
    await connectRedis();

    // Step 2: Initialize Socket.io on the HTTP server
    initSocketIO(server);

    // Step 3: Start listening
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
      await disconnectDB();
      await disconnectRedis();
      console.log('✔  SafeStride server stopped cleanly.');
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('✖  Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('✖  Uncaught Exception:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('✖  Unhandled Rejection:', reason);
});

bootstrap();

module.exports = server;