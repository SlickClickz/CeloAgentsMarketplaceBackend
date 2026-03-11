"use strict";
// import { CeloNetwork } from "../config/env";
// import { AgentFlag } from "../types/agent";
// import { getAgent, listFeedbacks } from "../lib/scan8004";
// import {
//   getSelfClawAgentByWallet,
//   getSelfClawReputation,
//   getAgentSelfClawSkills,
//   mapSelfClawCategory,
// } from "../lib/selfclaw";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeReputationScore = computeReputationScore;
const scan8004_1 = require("../lib/scan8004");
const selfclaw_1 = require("../lib/selfclaw");
// ─────────────────────────────────────────
// Scoring weights — total 60pts
// ─────────────────────────────────────────
const WEIGHTS = {
    scan8004Score: 20, // 8004scan total_score → 0-20
    feedbackScore: 15, // 8004scan feedback count + avg
    selfClawReputation: 15, // SelfClaw reputation score → 0-15
    selfClawSkills: 10, // skills published on SelfClaw marketplace
};
function computePlatformScore(totalScore) {
    return Math.round((totalScore / 100) * WEIGHTS.scan8004Score);
}
function computeFeedbackScore(totalFeedbacks, avgFeedbackScore) {
    if (totalFeedbacks === 0)
        return 0;
    let volumeScore = 0;
    if (totalFeedbacks >= 50)
        volumeScore = 7;
    else if (totalFeedbacks >= 20)
        volumeScore = 6;
    else if (totalFeedbacks >= 10)
        volumeScore = 5;
    else if (totalFeedbacks >= 5)
        volumeScore = 3;
    else if (totalFeedbacks >= 1)
        volumeScore = 2;
    const qualityScore = Math.round((avgFeedbackScore / 5) * 8);
    return Math.min(volumeScore + qualityScore, WEIGHTS.feedbackScore);
}
function computeSelfClawReputationScore(reputationScore, validated, slashed, badges) {
    // Base: map SelfClaw 0-100 score → 0-10
    let score = Math.round((reputationScore / 100) * 10);
    // Validated stakes bonus — proven outputs
    if (validated >= 10)
        score += 3;
    else if (validated >= 5)
        score += 2;
    else if (validated >= 1)
        score += 1;
    // Slashing penalty
    if (slashed > 0) {
        const slashRatio = slashed / Math.max(validated + slashed, 1);
        if (slashRatio > 0.3)
            score -= 3;
        else if (slashRatio > 0.1)
            score -= 1;
    }
    // Badge bonus
    if (badges.includes("Trusted Expert"))
        score += 2;
    else if (badges.includes("Reliable Output"))
        score += 1;
    return Math.min(Math.max(score, 0), WEIGHTS.selfClawReputation);
}
function computeSelfClawSkillScore(skillCount) {
    if (skillCount >= 5)
        return WEIGHTS.selfClawSkills;
    if (skillCount >= 3)
        return 7;
    if (skillCount >= 1)
        return 4;
    return 0;
}
async function computeReputationScore(agentId, network) {
    const flags = [];
    let score = 0;
    const agent = await (0, scan8004_1.getAgent)(agentId, network);
    if (!agent) {
        flags.push({
            type: "UNVERIFIED",
            message: "Agent not found in 8004scan — cannot compute reputation",
            severity: "warning",
        });
        return {
            score: 0,
            flags,
            meta: {
                scan8004Score: 0,
                totalFeedbacks: 0,
                avgFeedbackScore: 0,
                selfClawReputationScore: 0,
                selfClawValidatedStakes: 0,
                selfClawBadges: [],
                selfClawSkillCount: 0,
                selfClawSkillCategories: [],
                supportedProtocols: [],
                starCount: 0,
            },
        };
    }
    // ─────────────────────────────────────
    // Fetch all external data in parallel
    // ─────────────────────────────────────
    const [feedbacks, selfClawAgent] = await Promise.all([
        (0, scan8004_1.listFeedbacks)({
            network,
            tokenId: agent.token_id,
            limit: 50,
        }),
        (0, selfclaw_1.getSelfClawAgentByWallet)(agent.owner_address),
    ]);
    // Fetch SelfClaw reputation + skills in parallel
    // only if we found the agent on SelfClaw
    const [selfClawReputation, selfClawSkills] = await Promise.all([
        selfClawAgent?.publicKey
            ? (0, selfclaw_1.getSelfClawReputation)(selfClawAgent.publicKey)
            : Promise.resolve(null),
        selfClawAgent?.publicKey
            ? (0, selfclaw_1.getAgentSelfClawSkills)(selfClawAgent.publicKey) // ← publicKey not agentName
            : Promise.resolve([]),
    ]);
    // ─────────────────────────────────────
    // 8004scan platform score
    // ─────────────────────────────────────
    const platformPoints = computePlatformScore(agent.total_score ?? 0);
    score += platformPoints;
    // ─────────────────────────────────────
    // 8004scan feedback score
    // ─────────────────────────────────────
    const totalFeedbacks = agent.total_feedbacks ?? 0;
    const avgFeedbackScore = feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length
        : 0;
    const feedbackPoints = computeFeedbackScore(totalFeedbacks, avgFeedbackScore);
    score += feedbackPoints;
    // ─────────────────────────────────────
    // SelfClaw reputation score
    // ─────────────────────────────────────
    let selfClawReputationScore = 0;
    let selfClawValidatedStakes = 0;
    let selfClawBadges = [];
    if (selfClawReputation) {
        selfClawReputationScore = selfClawReputation.reputationScore;
        selfClawValidatedStakes = selfClawReputation.validated;
        selfClawBadges = selfClawReputation.badges ?? [];
        const reputationPoints = computeSelfClawReputationScore(selfClawReputation.reputationScore, selfClawReputation.validated, selfClawReputation.slashed, selfClawReputation.badges);
        score += reputationPoints;
    }
    // ─────────────────────────────────────
    // SelfClaw skill marketplace score
    // ─────────────────────────────────────
    const selfClawSkillCategories = [
        ...new Set(selfClawSkills.map((s) => (0, selfclaw_1.mapSelfClawCategory)(s.category))),
    ];
    const skillPoints = computeSelfClawSkillScore(selfClawSkills.length);
    score += skillPoints;
    // ─────────────────────────────────────
    // Flags
    // ─────────────────────────────────────
    if (totalFeedbacks === 0 &&
        (agent.total_score ?? 0) === 0 &&
        !selfClawReputation) {
        flags.push({
            type: "UNVERIFIED",
            message: "Agent has no community reputation on any platform yet",
            severity: "info",
        });
    }
    return {
        score: Math.min(score, 60),
        flags,
        meta: {
            scan8004Score: agent.total_score ?? 0,
            totalFeedbacks,
            avgFeedbackScore,
            selfClawReputationScore,
            selfClawValidatedStakes,
            selfClawBadges,
            selfClawSkillCount: selfClawSkills.length,
            selfClawSkillCategories,
            supportedProtocols: agent.supported_protocols ?? [],
            starCount: agent.star_count ?? 0,
        },
    };
}
//# sourceMappingURL=reputation.js.map