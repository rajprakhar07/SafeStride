'use strict';

/**
 * gemini.provider.js
 * Adapter for Google Gemini API.
 * Uniform interface:
 * generateCompletion({ systemPrompt, userPrompt, jsonMode }) -> string
 */

const { GoogleGenAI } = require('@google/genai');
const config = require('../../../config/environment');

async function generateCompletion({ systemPrompt, userPrompt, jsonMode }) {
  const apiKey = config.ai?.googleAiApiKey;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  const model = config.ai?.model || 'gemini-flash-latest';

  const ai = new GoogleGenAI({
    apiKey,
  });

  console.log('AI Provider:', config.ai?.provider);
  console.log('AI Model:', model);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\n${userPrompt}`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.4,
        ...(jsonMode
          ? {
              responseMimeType: 'application/json',
            }
          : {}),
      },
    });

    return response.text || '';

  } catch (err) {
    console.log('Gemini Error:', err.message);
    throw err;
  }
}

module.exports = { generateCompletion };