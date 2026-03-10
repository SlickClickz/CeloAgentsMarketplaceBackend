import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

// ─────────────────────────────────────────
// General API rate limit
// ─────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later",
    },
  },
});

// ─────────────────────────────────────────
// Stricter limit for score refresh endpoint
// Max 10 requests per minute per IP
// ─────────────────────────────────────────
export const scoreRefreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Score refresh rate limit exceeded, max 10 requests per minute",
    },
  },
});