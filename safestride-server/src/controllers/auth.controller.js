'use strict';

/**
 * auth.controller.js — F-03
 *
 * Handles all auth endpoint logic:
 *   POST /auth/send-otp    — generate OTP, send SMS, store in Redis
 *   POST /auth/verify-otp  — verify OTP, create/login user, issue tokens
 *   POST /auth/refresh     — rotate refresh token, issue new access token
 *   POST /auth/logout      — revoke refresh token
 */

const User           = require('../models/User');
const otpUtils       = require('../utils/otp.utils');
const tokenUtils     = require('../utils/token.utils');
const R              = require('../utils/response.utils');
const config         = require('../config/environment');

// ─── Twilio client (lazy — only initialised when needed) ─────────────────────
let twilioClient;
function getTwilioClient() {
  if (!twilioClient && config.twilio.accountSid && config.twilio.authToken) {
    const twilio = require('twilio');
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/send-otp
 * Body: { phone: "+919876543210" }
 *
 * 1. Check rate limit (max 3 per 10 min)
 * 2. Generate OTP
 * 3. Store hashed OTP in Redis
 * 4. Send SMS via Twilio (or log in dev)
 */
async function sendOTP(req, res, next) {
  try {
    const { phone } = req.body;

    // 1. Rate limit check
    const rateCheck = await otpUtils.checkRateLimit(phone);
    if (!rateCheck.allowed) {
      return R.tooManyRequests(
        res,
        `Too many OTP requests. Try again in ${Math.ceil(rateCheck.ttl / 60)} minutes.`,
        'OTP_RATE_LIMITED'
      );
    }

    // 2. Generate OTP
    const otp = otpUtils.generateOTP();

    // 3. Store in Redis (hashed)
    await otpUtils.storeOTP(phone, otp);

    // 4. Send SMS
    console.log("===== OTP DEBUG =====");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("isProd:", config.isProd);
console.log("TWILIO_ACCOUNT_SID:", !!config.twilio.accountSid);
console.log("TWILIO_AUTH_TOKEN:", !!config.twilio.authToken);
    const client = getTwilioClient();
    if (client && config.isProd) {
      await client.messages.create({
        body: `Your SafeStride verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
        from: config.twilio.phone,
        to:   phone,
      });
    } else {
      // Development: log OTP to console (never do this in production)
      console.log(`\n📱 OTP for ${phone}: ${otp}\n`);
    }

    return R.ok(res, { phone }, 'OTP sent successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/verify-otp
 * Body: { phone: "+919876543210", otp: "123456" }
 *
 * 1. Verify OTP from Redis
 * 2. Find or create user
 * 3. Issue access + refresh tokens
 */
async function verifyOTP(req, res, next) {
  try {
    const { phone, otp } = req.body;

    // 1. Verify OTP
    const result = await otpUtils.verifyOTP(phone, otp);
    if (!result.valid) {
      return R.unauthorized(res, result.reason, 'OTP_INVALID');
    }

    // 2. Find or create user
    let user = await User.findOne({ phone, deletedAt: null });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        phone,
        phoneVerified: true,
        isActive:      true,
        lastActiveAt:  new Date(),
      });
    } else {
      user.phoneVerified = true;
      user.lastActiveAt  = new Date();
      await user.save();
    }

    // 3. Issue tokens
    const accessToken  = tokenUtils.generateAccessToken(user);
    const refreshToken = await tokenUtils.generateRefreshToken(user);

    // 4. Set refresh token as httpOnly cookie
    tokenUtils.setRefreshCookie(res, refreshToken);

    return R.ok(res, {
      accessToken,
      isNewUser,
      onboardingComplete: user.onboardingComplete,
      user: {
        id:    user._id,
        phone: user.phone,
        name:  user.name || null,
      },
    }, isNewUser ? 'Account created successfully' : 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Cookie: refreshToken
 *
 * 1. Read refresh token from httpOnly cookie
 * 2. Verify + check Redis
 * 3. Load user
 * 4. Rotate refresh token
 * 5. Issue new access token
 */
async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return R.unauthorized(res, 'No refresh token provided', 'NO_REFRESH_TOKEN');
    }

    // 1. Verify token (checks Redis)
    let payload;
    try {
      payload = await tokenUtils.verifyRefreshToken(token);
    } catch (err) {
      tokenUtils.clearRefreshCookie(res);
      return R.unauthorized(res, err.message, 'REFRESH_TOKEN_INVALID');
    }

    // 2. Load user
    const user = await User.findOne({ _id: payload.userId, isActive: true, deletedAt: null });
    if (!user) {
      tokenUtils.clearRefreshCookie(res);
      return R.unauthorized(res, 'User not found', 'USER_NOT_FOUND');
    }

    // 3. Rotate refresh token (delete old, issue new)
    const newRefreshToken = await tokenUtils.rotateRefreshToken(token, user);
    const newAccessToken  = tokenUtils.generateAccessToken(user);

    // 4. Set new refresh cookie
    tokenUtils.setRefreshCookie(res, newRefreshToken);

    return R.ok(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * Cookie: refreshToken
 * Body: { everywhere?: boolean }
 *
 * Revokes the current refresh token (or all tokens if everywhere=true).
 */
async function logout(req, res, next) {
  try {
    const token      = req.cookies?.refreshToken;
    const everywhere = req.body?.everywhere === true;

    if (token) {
      if (everywhere && req.user) {
        await tokenUtils.revokeAllRefreshTokens(req.userId);
      } else {
        await tokenUtils.revokeRefreshToken(token);
      }
    }

    tokenUtils.clearRefreshCookie(res);

    return R.ok(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { sendOTP, verifyOTP, refreshToken, logout };