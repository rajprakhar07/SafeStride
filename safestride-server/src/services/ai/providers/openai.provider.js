'use strict';

/**
 * openai.provider.js
 * Adapter for OpenAI Chat Completions API.
 * Uniform interface: generateCompletion({ systemPrompt, userPrompt, jsonMode }) -> string
 */

const axios  = require('axios');
const config = require('../../../config/environment');

async function generateCompletion({ systemPrompt, userPrompt, jsonMode }) {
  const apiKey = config.ai?.openaiApiKey;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const { data } = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: config.ai?.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.4,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 8000,
    }
  );

  return data.choices?.[0]?.message?.content || '';
}

module.exports = { generateCompletion };