"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchExecutionData = fetchExecutionData;
exports.computeExecutionScore = computeExecutionScore;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
// ─────────────────────────────────────────
// Scoring weights
// ─────────────────────────────────────────
const WEIGHTS = {
    volume: 20, // total transaction volume
    successRate: 10, // success rate
    recency: 10, // last active timestamp
};
// Inactivity threshold — 7 days
const INACTIVE_THRESHOLD_DAYS = 7;
// ─────────────────────────────────────────
// Fetch agent activity from AgentScan
// ─────────────────────────────────────────
async function fetchExecutionData(agentId, network) {
    try {
        const response = await axios_1.default.get(`${env_1.env.agentScanApiUrl}/agents/${agentId}`, {
            headers: { "x-api-key": env_1.env.agentScanApiKey },
            params: { network },
            timeout: 10000,
        });
        if (response.data.status !== "ok" || !response.data.data)
            return null;
        return response.data.data;
    }
    catch (err) {
        console.warn(`[Execution] Failed to fetch AgentScan data for ${agentId}: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────
// Volume score — log scale so early agents
// aren't permanently disadvantaged
// 0 txns = 0pts, 10+ = 5pts, 100+ = 10pts,
// 500+ = 15pts, 1000+ = 20pts
// ─────────────────────────────────────────
function computeVolumeScore(totalTx) {
    if (totalTx >= 1000)
        return 20;
    if (totalTx >= 500)
        return 15;
    if (totalTx >= 100)
        return 10;
    if (totalTx >= 10)
        return 5;
    if (totalTx >= 1)
        return 2;
    return 0;
}
// ─────────────────────────────────────────
// Success rate score — 0 to 10pts
// ─────────────────────────────────────────
function computeSuccessRateScore(successRate) {
    if (successRate >= 0.99)
        return 10;
    if (successRate >= 0.95)
        return 8;
    if (successRate >= 0.90)
        return 6;
    if (successRate >= 0.80)
        return 4;
    if (successRate >= 0.60)
        return 2;
    return 0;
}
// ─────────────────────────────────────────
// Recency score — rewards recently active
// agents, penalizes stale ones
// ─────────────────────────────────────────
function computeRecencyScore(lastActiveTimestamp) {
    const lastActiveMs = new Date(lastActiveTimestamp).getTime();
    const ageHours = (Date.now() - lastActiveMs) / (1000 * 60 * 60);
    const ageDays = ageHours / 24;
    if (ageDays > INACTIVE_THRESHOLD_DAYS) {
        return { score: 0, isInactive: true };
    }
    if (ageHours <= 24)
        return { score: 10, isInactive: false };
    if (ageHours <= 72)
        return { score: 7, isInactive: false };
    if (ageDays <= 7)
        return { score: 4, isInactive: false };
    return { score: 0, isInactive: true };
}
// ─────────────────────────────────────────
// Main export
// ─────────────────────────────────────────
async function computeExecutionScore(agentId, network) {
    const flags = [];
    let score = 0;
    const data = await fetchExecutionData(agentId, network);
    if (!data) {
        flags.push({
            type: "INACTIVE",
            message: "No execution data found in AgentScan",
            severity: "warning",
        });
        return {
            score: 0,
            flags,
            meta: {
                totalTransactions: 0,
                successRate: 0,
                lastActiveTimestamp: null,
                activityCategories: [],
            },
        };
    }
    // Volume score
    score += computeVolumeScore(data.totalTransactions);
    // Success rate score
    score += computeSuccessRateScore(data.successRate);
    // Recency score
    const { score: recencyScore, isInactive } = computeRecencyScore(data.lastActiveTimestamp);
    score += recencyScore;
    if (isInactive) {
        flags.push({
            type: "INACTIVE",
            message: `Agent has not been active in the last ${INACTIVE_THRESHOLD_DAYS} days`,
            severity: "warning",
        });
    }
    return {
        score: Math.min(score, 40), // hard cap at 40
        flags,
        meta: {
            totalTransactions: data.totalTransactions,
            successRate: data.successRate,
            lastActiveTimestamp: data.lastActiveTimestamp,
            activityCategories: data.activityCategories,
        },
    };
}
//# sourceMappingURL=execution.js.map