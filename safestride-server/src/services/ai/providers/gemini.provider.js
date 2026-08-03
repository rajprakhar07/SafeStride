'use strict';

/**
 * gemini.provider.js
 * Adapter for Google Gemini API.
 * Uniform interface: generateCompletion({ systemPrompt, userPrompt, jsonMode }) -> string
 */

const axios  = require('axios');
const config = require('../../../config/environment');

async function generateCompletion({ systemPrompt, userPrompt, jsonMode }) {
  const apiKey = config.ai?.geminiApiKey;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = config.ai?.model || 'gemini-1.5-flash';
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
console.log('AI Provider:', config.ai?.provider);
console.log('AI Model:', model);
console.log('Gemini URL:', url);
  try {
  const { data } = await axios.post(
    url,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    },
    { timeout: 8000 }
  );

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";

} catch (err) {
  console.log("STATUS:", err.response?.status);
  console.log("DATA:", err.response?.data);
  throw err;
}

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = { generateCompletion };