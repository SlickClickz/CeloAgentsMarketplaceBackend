"use strict";
// import { CeloNetwork } from "../config/env";
// import { CAMScore, AgentFlag } from "../types/agent";
// import { computeIdentityScore } from "./identity";
// import { computeExecutionScore, fetchExecutionData } from "./execution";
// import { computeIntegrityScore } from "./integrity";
// import { getAgentById, upsertScore } from "../db/client";
// import { syncScoreToIndex } from "../indexer";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAndStoreScore = computeAndStoreScore;
const identity_1 = require("./identity");
const reputation_1 = require("./reputation");
const client_1 = require("../db/client");
const indexer_1 = require("../indexer");
// ─────────────────────────────────────────
// CAM Score = Identity (0-40) + Reputation (0-60)
// Total: 0-100
// ─────────────────────────────────────────
async function computeAndStoreScore(agentId, network) {
    const agent = await (0, client_1.getAgentById)(agentId, network);
    if (!agent) {
        throw new Error(`[Scoring] Agent ${agentId} not found on ${network}`);
    }
    // Run both scorers in parallel
    const [identityResult, reputationResult] = await Promise.all([
        (0, identity_1.computeIdentityScore)(agentId, network),
        (0, reputation_1.computeReputationScore)(agentId, network),
    ]);
    // Merge and deduplicate flags
    const allFlags = deduplicateFlags([
        ...identityResult.flags,
        ...reputationResult.flags,
    ]);
    const total = identityResult.score + reputationResult.score;
    const camScore = {
        agentId,
        network,
        total: Math.min(total, 100),
        breakdown: {
            identity: identityResult.score,
            execution: reputationResult.score, // reuse execution field in DB
            skillIntegrity: 0, // set to 0 — no longer used
        },
        flags: allFlags,
        lastUpdated: new Date(),
    };
    await (0, client_1.upsertScore)(camScore);
    await (0, indexer_1.syncScoreToIndex)(agentId, network, camScore.total);
    console.log(`[Scoring] Agent ${agentId} on ${network}: ` +
        `total=${camScore.total} ` +
        `(identity=${identityResult.score}, reputation=${reputationResult.score})`);
    return camScore;
}
function deduplicateFlags(flags) {
    const severityRank = { critical: 3, warning: 2, info: 1 };
    const seen = new Map();
    for (const flag of flags) {
        const existing = seen.get(flag.type);
        if (!existing ||
            severityRank[flag.severity] > severityRank[existing.severity]) {
            seen.set(flag.type, flag);
        }
    }
    return [...seen.values()];
}
//# sourceMappingURL=index.js.map