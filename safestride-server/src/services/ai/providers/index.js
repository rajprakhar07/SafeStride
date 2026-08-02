'use strict';

/**
 * providers/index.js
 * SINGLE SWITCH POINT for AI providers.
 * To change providers later, edit ONLY the AI_PROVIDER env var —
 * nothing else in the app needs to change.
 */

const config = require('../../../config/environment');

const providers = {
  openai: require('./openai.provider'),
  gemini: require('./gemini.provider'),
  claude: require('./claude.provider'),
};

function getActiveProvider() {
  const name = config.ai?.provider || 'openai';
  const impl = providers[name];
  if (!impl) throw new Error(`Unknown AI provider configured: ${name}`);
  return impl;
}

/**
 * @param {{ systemPrompt: string, userPrompt: string, jsonMode?: boolean }} params
 * @returns {Promise<string>} raw text response
 */
async function generateCompletion(params) {
  const impl = getActiveProvider();
  return impl.generateCompletion(params);
}

module.exports = { generateCompletion };