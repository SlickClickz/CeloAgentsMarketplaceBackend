"use strict";
// import { env, CeloNetwork } from "../config/env";
// import { AgentFlag } from "../types/agent";
// import { getAgent } from "../lib/scan8004";
// import { Scan8004Agent } from "../types/erc8004";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeIdentityScore = computeIdentityScore;
const scan8004_1 = require("../lib/scan8004");
const selfclaw_1 = require("../lib/selfclaw");
// ─────────────────────────────────────────
// Scoring weights — total 40pts
// ─────────────────────────────────────────
const WEIGHTS = {
    isRegistered: 10, // base ERC-8004 registration
    ageBonus: 8, // registration age
    selfClawVerified: 12, // SelfClaw verification (scaled by level)
    platformScore: 5, // 8004scan community score
    erc8004Pipeline: 5, // completed full pipeline on SelfClaw
};
function computeAgeBonus(createdAt) {
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= 30)
        return 8;
    if (ageDays >= 14)
        return 6;
    if (ageDays >= 7)
        return 4;
    if (ageDays >= 1)
        return 2;
    return 0;
}
function computePlatformScoreBonus(totalScore) {
    if (totalScore >= 80)
        return 5;
    if (totalScore >= 60)
        return 4;
    if (totalScore >= 40)
        return 3;
    if (totalScore >= 20)
        return 2;
    if (totalScore > 0)
        return 1;
    return 0;
}
async function computeIdentityScore(agentId, network) {
    const flags = [];
    let score = 0;
    const agent = await (0, scan8004_1.getAgent)(agentId, network);
    if (!agent) {
        flags.push({
            type: "UNVERIFIED",
            message: "Agent not found in 8004scan registry",
            severity: "critical",
        });
        return {
            score: 0,
            flags,
            meta: {
                selfClawVerified: false,
                selfClawVerificationLevel: null,
                registeredAt: null,
                ageDays: 0,
                platformScore: 0,
                starCount: 0,
                supportedProtocols: [],
                selfClawPipelineComplete: false,
            },
        };
    }
    // Base registration
    score += WEIGHTS.isRegistered;
    // Age bonus
    const ageBonus = computeAgeBonus(agent.created_at);
    score += ageBonus;
    const ageDays = Math.floor((Date.now() - new Date(agent.created_at).getTime()) /
        (1000 * 60 * 60 * 24));
    if (ageDays < 1) {
        flags.push({
            type: "NEW_AGENT",
            message: "Agent registered less than 24 hours ago",
            severity: "info",
        });
    }
    // ─────────────────────────────────────
    // SelfClaw cross-reference
    // Look up by owner wallet address —
    // this is our bridge between 8004scan
    // and SelfClaw identities
    // ─────────────────────────────────────
    const [selfClawAgent, selfClawReputation] = await Promise.all([
        (0, selfclaw_1.getSelfClawAgentByWallet)(agent.owner_address),
        (0, selfclaw_1.getSelfClawAgentByWallet)(agent.owner_address).then((a) => a?.publicKey
            ? (0, selfclaw_1.getSelfClawReputation)(a.publicKey)
            : Promise.resolve(null)),
    ]);
    let selfClawVerified = false;
    let selfClawVerificationLevel = null;
    let selfClawPipelineComplete = false;
    if (selfClawAgent?.verified) {
        selfClawVerified = true;
        selfClawVerificationLevel =
            selfClawAgent.verificationLevel ?? "verified";
        // Scale SelfClaw score by verification level strength
        const levelScore = (0, selfclaw_1.getVerificationLevelScore)(selfClawAgent.verificationLevel);
        score += Math.round(WEIGHTS.selfClawVerified * levelScore);
        // Bonus for completing the full SelfClaw pipeline
        // (verified + wallet + token + ERC-8004 + sponsorship)
        if (selfClawAgent.pipeline) {
            const pipeline = selfClawAgent.pipeline;
            selfClawPipelineComplete =
                pipeline.verified &&
                    pipeline.walletCreated &&
                    pipeline.erc8004Registered;
            if (selfClawPipelineComplete) {
                score += WEIGHTS.erc8004Pipeline;
            }
        }
    }
    else {
        flags.push({
            type: "UNVERIFIED",
            message: "Agent has not completed SelfClaw verification",
            severity: "warning",
        });
    }
    // Platform score bonus from 8004scan
    const platformBonus = computePlatformScoreBonus(agent.total_score ?? 0);
    score += platformBonus;
    return {
        score: Math.min(score, 40), // hard cap at 40
        flags,
        meta: {
            selfClawVerified,
            selfClawVerificationLevel,
            registeredAt: agent.created_at,
            ageDays,
            platformScore: agent.total_score ?? 0,
            starCount: agent.star_count ?? 0,
            supportedProtocols: agent.supported_protocols ?? [],
            selfClawPipelineComplete,
        },
    };
}
//# sourceMappingURL=identity.js.map