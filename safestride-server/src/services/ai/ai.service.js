'use strict';

/**
 * ai.service.js — AI Safety Assistant orchestrator
 *
 * Reuses risk.service.js (READ-ONLY, unmodified) for quantitative route
 * risk scoring, then asks the configured LLM provider to turn that score
 * into human-readable guidance.
 */

const riskService = require('../risk.service');
const provider     = require('./providers');
const Journey      = require('../../models/Journey');

const SAFETY_DISCLAIMER =
  'This is AI-generated advisory guidance and does not replace official emergency services.';

// ─── Context resolution ────────────────────────────────────────────────────

async function getJourneyContext({ journeyId, userId, origin, destination, transportMode, plannedDurationMinutes }) {
  if (journeyId) {
    const journey = await Journey.findOne({ _id: journeyId, userId }).lean();
    if (journey) {
      return {
        origin:                  journey.startLocation?.coordinates,
        destination:              journey.plannedDestination?.coordinates,
        destinationLabel:        journey.plannedDestination?.formattedAddress,
        transportMode:           journey.transportMode,
        plannedDurationMinutes:  journey.plannedDurationMinutes,
        existingRisk: journey.plannedRoute
          ? { riskScore: journey.plannedRoute.riskScore, riskLevel: journey.plannedRoute.riskLevel }
          : null,
      };
    }
  }

  return {
    origin,
    destination,
    destinationLabel:       destination?.formattedAddress,
    transportMode:          transportMode || 'walking',
    plannedDurationMinutes,
    existingRisk:           null,
  };
}

// ─── Safety analysis ───────────────────────────────────────────────────────

async function analyzeJourney(params) {
  const ctx = await getJourneyContext(params);

  if (!ctx.origin || !ctx.destination) {
    return {
      unavailable: true,
      message: 'Origin and destination are required for safety analysis.',
      safetyScore: null,
      riskLevel: null,
    };
  }

  // 1. Quantitative score — unchanged existing service, cached, has its own fallback
  let risk;
  try {
    risk = await riskService.scoreRoute({
      origin:        ctx.origin,
      destination:   ctx.destination,
      transportMode: ctx.transportMode,
      atTime:        new Date(),
    });
  } catch {
    risk = { riskScore: 50, riskLevel: 'moderate', factors: [], dangerSpotCount: 0, isFallback: true };
  }

  // 2. Natural-language layer on top of the score
  try {
    const raw = await provider.generateCompletion({
      systemPrompt: buildSystemPrompt(),
      userPrompt:   buildAnalysisPrompt(ctx, risk),
      jsonMode:     true,
    });

    const parsed = safeParseJSON(raw);
    if (!parsed) throw new Error('AI response was not valid JSON');

    return {
      unavailable:     false,
      safetyScore:     clampScore(parsed.safetyScore ?? risk.riskScore),
      riskLevel:       parsed.riskLevel || risk.riskLevel,
      summary:         parsed.summary || '',
      recommendations: toList(parsed.recommendations, 8),
      concerns:        toList(parsed.concerns, 6),
      precautions:     toList(parsed.precautions, 6),
      emergencyTips:   toList(parsed.emergencyTips, 6, defaultEmergencyTips()),
      disclaimer:      SAFETY_DISCLAIMER,
      riskSource:      risk.isFallback ? 'fallback' : 'ai-model',
    };
  } catch (err) {
    console.warn(`⚠  AI Safety Assistant unavailable: ${err.message}`);
    return {
      unavailable:   true,
      message:       'AI Safety Analysis is temporarily unavailable.',
      safetyScore:   risk.riskScore ?? null,
      riskLevel:     risk.riskLevel ?? null,
      emergencyTips: defaultEmergencyTips(),
      disclaimer:    SAFETY_DISCLAIMER,
    };
  }
}

// ─── Chat assistant ─────────────────────────────────────────────────────────

async function chat({ message, journeyId, userId, context }) {
  const ctx = journeyId ? await getJourneyContext({ journeyId, userId }) : (context || {});

  try {
    const reply = await provider.generateCompletion({
      systemPrompt: buildChatSystemPrompt(ctx),
      userPrompt:   message,
      jsonMode:     false,
    });

    return { unavailable: false, reply: reply.trim(), disclaimer: SAFETY_DISCLAIMER };
  } catch (err) {
    console.warn(`⚠  AI Chat unavailable: ${err.message}`);
    return {
      unavailable: true,
      message:     'AI Safety Analysis is temporarily unavailable.',
      reply:       null,
    };
  }
}

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildSystemPrompt() {
  return [
    "You are SafeStride's AI Safety Assistant.",
    'You give concise, practical personal-safety guidance for someone about to travel a route.',
    'You are not a replacement for emergency services.',
    'Respond ONLY with valid JSON, no markdown, no prose outside the JSON, matching:',
    '{"safetyScore": number 0-100, "riskLevel": "low"|"moderate"|"high", "summary": string, ' +
      '"recommendations": string[], "concerns": string[], "precautions": string[], "emergencyTips": string[]}',
  ].join(' ');
}

function buildAnalysisPrompt(ctx, risk) {
  return [
    `Transport mode: ${ctx.transportMode}`,
    ctx.plannedDurationMinutes ? `Planned duration: ${ctx.plannedDurationMinutes} minutes` : null,
    ctx.destinationLabel ? `Destination: ${ctx.destinationLabel}` : null,
    `Computed quantitative risk score: ${risk.riskScore}/100 (${risk.riskLevel})`,
    risk.factors?.length ? `Risk factors: ${risk.factors.join(', ')}` : null,
    risk.dangerSpotCount != null ? `Reported danger spots near route: ${risk.dangerSpotCount}` : null,
    'Generate the JSON safety analysis now.',
  ].filter(Boolean).join('\n');
}

function buildChatSystemPrompt(ctx) {
  return [
    "You are SafeStride's AI Safety Assistant, a supportive in-app guide for solo travelers.",
    'Answer briefly and practically. Do not invent facts about the user\'s exact location.',
    ctx.transportMode ? `Known context — transport mode: ${ctx.transportMode}.` : '',
    ctx.destinationLabel ? `Known context — destination: ${ctx.destinationLabel}.` : '',
    "If the user describes an active emergency, tell them to contact local emergency services and use the app's SOS button immediately.",
  ].filter(Boolean).join(' ');
}

function defaultEmergencyTips() {
  return [
    'Stay calm and move toward a well-lit, crowded place if possible.',
    'Call local emergency services immediately.',
    'Keep GPS/location sharing enabled.',
    "Use the app's SOS button to alert your trusted contacts.",
    'Wait in a safe, visible location for help to arrive.',
  ];
}

function clampScore(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function toList(val, max, fallback = []) {
  return Array.isArray(val) ? val.slice(0, max) : fallback;
}

function safeParseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
}

module.exports = { analyzeJourney, chat };