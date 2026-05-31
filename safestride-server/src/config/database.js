'use strict';

/**
 * database.js — F-01
 *
 * Connects to MongoDB via Mongoose with exponential-backoff retry.
 * Exports connectDB() — called once in server.js before the HTTP server starts.
 *
 * Retry policy:
 *   - Max attempts : 5
 *   - Initial delay: 1 000 ms
 *   - Backoff factor: 2× (1s → 2s → 4s → 8s → 16s)
 */

const mongoose = require('mongoose');
const config   = require('./environment');

// ─── Mongoose global settings ─────────────────────────────────────────────────
mongoose.set('strictQuery', true);

const MAX_ATTEMPTS   = 5;
const INITIAL_DELAY  = 1_000;  // ms
const BACKOFF_FACTOR = 2;

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempt one Mongoose connection.
 * Throws if the connection fails.
 */
async function attempt() {
  await mongoose.connect(config.db.uri, {
    // These are recommended defaults for Mongoose 8+
    serverSelectionTimeoutMS: 5_000,   // give up server selection after 5 s
    socketTimeoutMS: 45_000,
  });
}

/**
 * Connect to MongoDB with exponential-backoff retry.
 * Called once on server startup — awaited before HTTP server starts.
 *
 * @throws {Error} if all attempts are exhausted
 */
async function connectDB() {
  let attempt_number = 1;
  let delay = INITIAL_DELAY;

  while (attempt_number <= MAX_ATTEMPTS) {
    try {
      await attempt();
      console.log(`✔  MongoDB connected successfully [${config.env}]`);

      // ── Connection event listeners ──────────────────────────────────────
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠  MongoDB disconnected — Mongoose will attempt reconnect');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✔  MongoDB reconnected');
      });

      mongoose.connection.on('error', (err) => {
        console.error('✖  MongoDB connection error:', err.message);
      });

      return; // success — exit the loop

    } catch (err) {
      const isLastAttempt = attempt_number === MAX_ATTEMPTS;

      if (isLastAttempt) {
        console.error(`✖  MongoDB connection failed after ${MAX_ATTEMPTS} attempts.`);
        console.error(`   Last error: ${err.message}`);
        throw err; // bubble up — server.js will handle process.exit
      }

      console.warn(
        `⚠  MongoDB attempt ${attempt_number}/${MAX_ATTEMPTS} failed: ${err.message}` +
        ` — retrying in ${delay / 1_000}s…`
      );

      await sleep(delay);
      delay *= BACKOFF_FACTOR;
      attempt_number++;
    }
  }
}

/**
 * Gracefully close the Mongoose connection.
 * Called during SIGTERM / SIGINT shutdown.
 */
async function disconnectDB() {
  await mongoose.connection.close();
  console.log('✔  MongoDB connection closed');
}

module.exports = { connectDB, disconnectDB };
