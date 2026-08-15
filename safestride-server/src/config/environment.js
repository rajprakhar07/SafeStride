'use strict';
require('dotenv').config();
/**
 * environment.js — F-01
 *
 * Validates ALL required environment variables with Joi on startup.
 * The app crashes immediately with a clear error if anything is missing or invalid.
 * Exports a frozen, typed config object — the rest of the codebase imports from
 * here, never from process.env directly.
 */

const Joi = require('joi');

// ─── Validation schema ────────────────────────────────────────────────────────
const schema = Joi.object({
  // ── Core ──────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number()
    .integer()
    .min(1024)
    .max(65535)
    .default(5000),

  // ── Database ──────────────────────────────────────────────────────────────
    MONGODB_URI: Joi.string()
  .pattern(/^mongodb(\+srv)?:\/\//)
  .required()
  .messages({
    'string.pattern.base': 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
  }),
 
    

  // ── Cache ─────────────────────────────────────────────────────────────────
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required()
    .messages({ 'string.uri': 'REDIS_URL must be a valid redis:// or rediss:// URI' }),

  // ── JWT (required in F-03, validated here for fail-fast) ─────────────────
  JWT_ACCESS_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // ── Twilio (required in F-18) ─────────────────────────────────────────────
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE: Joi.string().optional(),
  TWILIO_WHATSAPP_FROM: Joi.string().optional(),

  // ── Firebase (required in F-17) ───────────────────────────────────────────
  FIREBASE_SERVICE_ACCOUNT: Joi.string().optional(),

  // ── Google Maps (required in F-10) ────────────────────────────────────────
  ORS_API_KEY: Joi.string().optional(),

  // ── Cloudinary (required in F-05) ─────────────────────────────────────────
  CLOUDINARY_URL: Joi.string().optional(),

  // ── SendGrid (required in F-17) ───────────────────────────────────────────
  SENDGRID_API_KEY: Joi.string().optional(),

  // ── AI Microservice (required in F-22) ────────────────────────────────────
  AI_SERVICE_URL: Joi.string().uri().default('http://localhost:8000'),
   
 
 // ── AI Safety Assistant (new, additive, all optional) ─────────────────────
  AI_PROVIDER:        Joi.string().valid('openai', 'gemini', 'claude').default('openai'),
  OPENAI_API_KEY:      Joi.string().optional(),
  GOOGLE_AI_API_KEY: Joi.string().optional(),
  ANTHROPIC_API_KEY:   Joi.string().optional(),
  AI_MODEL:            Joi.string().optional(),

  // ── CORS ──────────────────────────────────────────────────────────────────
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
})
  .options({ allowUnknown: true, stripUnknown: true, abortEarly: false });

// ─── Validate ─────────────────────────────────────────────────────────────────
const { error, value: env } = schema.validate(process.env);

if (error) {
  const messages = error.details.map((d) => `  ✖  ${d.message}`).join('\n');
  console.error('\n╔══════════════════════════════════════════════════╗');
  console.error('║       SafeStride — Environment Config Error      ║');
  console.error('╠══════════════════════════════════════════════════╣');
  console.error(messages);
  console.error('╚══════════════════════════════════════════════════╝\n');
  console.error('Fix the above in your .env file, then restart.\n');
  process.exit(1);
}

// ─── Exported config (frozen — do not mutate) ─────────────────────────────────
const config = Object.freeze({
  env:  env.NODE_ENV,
  port: env.PORT,
  isDev:  env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  db: {
    uri: env.MONGODB_URI,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    accessSecret:  env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn:  env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  twilio: {
    accountSid:    env.TWILIO_ACCOUNT_SID,
    authToken:     env.TWILIO_AUTH_TOKEN,
    phone:         env.TWILIO_PHONE,
    whatsappFrom:  env.TWILIO_WHATSAPP_FROM,
  },

  firebase: {
  serviceAccount: (() => {
    try {
      return env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
        : null;
    } catch (e) {
      console.error(' Invalid FIREBASE_SERVICE_ACCOUNT JSON in .env');
      process.exit(1);
    }
  })(),
},

 openRouteService: {
  apiKey: env.ORS_API_KEY,
},

  cloudinary: {
    url: env.CLOUDINARY_URL,
  },

  sendgrid: {
    apiKey: env.SENDGRID_API_KEY,
  },

  aiService: {
    url: env.AI_SERVICE_URL,
  },
    ai: {
    provider:       env.AI_PROVIDER,
    openaiApiKey:    env.OPENAI_API_KEY,
    googleAiApiKey: env.GOOGLE_AI_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    model:          env.AI_MODEL,
  },

  cors: {
    frontendUrl: env.FRONTEND_URL,
  },
});

module.exports = config;
