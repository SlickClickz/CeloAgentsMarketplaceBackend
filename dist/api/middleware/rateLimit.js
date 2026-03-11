"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreRefreshLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../../config/env");
// ─────────────────────────────────────────
// General API rate limit
// ─────────────────────────────────────────
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.rateLimitWindowMs,
    max: env_1.env.rateLimitMax,
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
exports.scoreRefreshLimiter = (0, express_rate_limit_1.default)({
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
//# sourceMappingURL=rateLimit.js.map