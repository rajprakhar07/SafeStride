'use strict';

/**
 * claude.provider.js
 * Adapter for Anthropic Claude Messages API.
 * Uniform interface: generateCompletion({ systemPrompt, userPrompt, jsonMode }) -> string
 */

const axios  = require('axios');
const config = require('../../../config/environment');

async function generateCompletion({ systemPrompt, userPrompt, jsonMode }) {
  const apiKey = config.ai?.anthropicApiKey;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model:      config.ai?.model || 'claude-sonnet-4-6',
      max_tokens: 1000,
      system:     jsonMode ? `${systemPrompt} Respond with JSON only, no other text.` : systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    },
    {
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      timeout: 8000,
    }
  );

  return data.content?.find((b) => b.type === 'text')?.text || '';
}

module.exports = { generateCompletion };