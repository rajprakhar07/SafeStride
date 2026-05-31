'use strict';
require('dotenv').config();   // MUST BE FIRST

const config = require('./config/environment');

/**
 * server.js — SafeStride entry point
 *
 * Startup order (per F-01 spec):
 *   1. Environment validation  (crashes fast if .env is broken)
 *   2. MongoDB connection       (with retry)
 *   3. Redis connection         (with retry + PING)
 *   4. Express HTTP server      (starts only after infra is ready)
 */

// Step 1 — Environment validation
// This MUST be the first require after dotenv.
// If any required var is missing the process exits here with a clear error.


const http                           = require('http');
const app                            = require('./app');
const { connectDB, disconnectDB }     = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

// ─── HTTP server (created but not yet listening) ──────────────────────────────
const server = http.createServer(app);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);

  server.close(async () => {
    try {
      await disconnectDB();
      await disconnectRedis();
      console.log('✔  SafeStride server stopped cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('✖  Error during shutdown:', err.message);
      process.exit(1);
    }
  });

  // Force-kill if graceful shutdown takes > 15 s
  setTimeout(() => {
    console.error('✖  Shutdown timeout — forcing exit');
    process.exit(1);
  }, 15_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Unhandled rejections & exceptions ───────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('✖  Unhandled Rejection at:', promise, '— reason:', reason);
  // In production, let the process manager (PM2) restart the service
  // Do NOT exit here during development so hot-reload keeps working
});

process.on('uncaughtException', (err) => {
  console.error('✖  Uncaught Exception:', err.message);
  process.exit(1);
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║         SafeStride  v1.0.0            ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log(`  Environment : ${config.env}`);
    console.log(`  Port        : ${config.port}`);
    console.log('');

    // Step 2 — MongoDB
    await connectDB();

    // Step 3 — Redis
    await connectRedis();

    // Step 4 — HTTP server
    server.listen(config.port, () => {
      console.log(`✔  HTTP server listening on port ${config.port}`);
      console.log('');
      console.log('  SafeStride is ready to accept requests.');
      console.log(`  Health check → http://localhost:${config.port}/health`);
      console.log('');
    });

  } catch (err) {
    console.error('\n✖  Bootstrap failed:', err.message);
    console.error('   SafeStride cannot start. Fix the error above and retry.\n');
    process.exit(1);
  }
}

bootstrap();

// Export for Supertest integration tests (F-03+)
module.exports = server;
