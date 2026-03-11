"use strict";
// import { AgentMetadata, AgentSkill } from "../types/agent";
// import {
//   parseSkillMd,
//   inferSkillsFromProtocols,
//   parseSelfClawSkills,
//   mergeSkillSources,
//   skillsToEmbeddingText,
// } from "./skillParser";
// import { generateEmbedding } from "./embeddings";
// import { upsertSkillVector, updateVectorScore } from "./vector";
// import { getAgent } from "../lib/scan8004";
// import {
//   getSelfClawAgentByWallet,
//   getAgentSelfClawSkills,
// } from "../lib/selfclaw";
// import { CeloNetwork } from "../config/env";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexAgentSkills = indexAgentSkills;
exports.reindexAgent = reindexAgent;
exports.syncScoreToIndex = syncScoreToIndex;
const skillParser_1 = require("./skillParser");
const embeddings_1 = require("./embeddings");
const vector_1 = require("./vector");
const scan8004_1 = require("../lib/scan8004");
const selfclaw_1 = require("../lib/selfclaw");
async function indexAgentSkills(agent) {
    // ─────────────────────────────────────
    // Source 1: skill.md
    // Already parsed and stored in agent.skills
    // ─────────────────────────────────────
    const skillMdSkills = agent.skills ?? [];
    // ─────────────────────────────────────
    // Source 2: SelfClaw skill marketplace
    // Look up agent by wallet address to get
    // publicKey, then fetch skills by publicKey
    // ─────────────────────────────────────
    let selfClawParsedSkills = [];
    try {
        const selfClawAgent = await (0, selfclaw_1.getSelfClawAgentByWallet)(agent.walletAddress);
        if (selfClawAgent?.publicKey) {
            const selfClawSkills = await (0, selfclaw_1.getAgentSelfClawSkills)(selfClawAgent.publicKey);
            selfClawParsedSkills = (0, skillParser_1.parseSelfClawSkills)(selfClawSkills);
            if (selfClawParsedSkills.length > 0) {
                console.log(`[Indexer] Found ${selfClawParsedSkills.length} SelfClaw skill(s) for agent ${agent.agentId}`);
            }
        }
    }
    catch {
        // SelfClaw lookup failed — continue with other sources
    }
    // ─────────────────────────────────────
    // Source 3: Protocol-inferred skills
    // from 8004scan supported_protocols
    // ─────────────────────────────────────
    let protocolSkills = [];
    try {
        const scan8004Agent = await (0, scan8004_1.getAgent)(agent.agentId, agent.network);
        if (scan8004Agent?.supported_protocols?.length) {
            protocolSkills = (0, skillParser_1.inferSkillsFromProtocols)(scan8004Agent.supported_protocols);
            if (protocolSkills.length > 0) {
                console.log(`[Indexer] Inferred ${protocolSkills.length} skill(s) from protocols for agent ${agent.agentId}: ` +
                    `${scan8004Agent.supported_protocols.join(", ")}`);
            }
        }
    }
    catch {
        // Protocol lookup failed — continue
    }
    // ─────────────────────────────────────
    // Merge all sources
    // Priority: skill.md > SelfClaw > protocol
    // ─────────────────────────────────────
    const mergedSkills = (0, skillParser_1.mergeSkillSources)(skillMdSkills, selfClawParsedSkills, protocolSkills);
    // ─────────────────────────────────────
    // Build embedding text
    // If no skills from any source, fall back
    // to agent identity so the agent still
    // appears in discovery search results
    // ─────────────────────────────────────
    const hasFallback = mergedSkills.length === 0;
    const embeddingText = hasFallback
        ? [
            agent.name,
            agent.description,
            `agent ${agent.agentId}`,
            "celo agent",
            agent.walletAddress,
        ]
            .filter(Boolean)
            .join(" ")
        : (0, skillParser_1.skillsToEmbeddingText)(mergedSkills);
    if (!embeddingText.trim()) {
        console.warn(`[Indexer] Agent ${agent.agentId} has no indexable content, skipping`);
        return;
    }
    if (hasFallback) {
        console.log(`[Indexer] Agent ${agent.agentId} has no skills from any source — indexing from identity only`);
    }
    else {
        console.log(`[Indexer] Agent ${agent.agentId} — ` +
            `${skillMdSkills.length} from skill.md, ` +
            `${selfClawParsedSkills.length} from SelfClaw, ` +
            `${protocolSkills.length} inferred from protocols`);
    }
    // ─────────────────────────────────────
    // Generate embedding and store in pgvector
    // ─────────────────────────────────────
    const embedding = await (0, embeddings_1.generateEmbedding)(embeddingText);
    await (0, vector_1.upsertSkillVector)(agent.agentId, agent.network, embedding, {
        name: agent.name,
        skills: mergedSkills.map((s) => s.name),
        categories: [...new Set(mergedSkills.map((s) => s.category))],
        x402Endpoint: agent.x402Endpoint,
        camScore: 0,
    });
    console.log(`[Indexer] ✅ Indexed agent ${agent.agentId} on ${agent.network} — ` +
        `${mergedSkills.length} skill(s), source: ${hasFallback ? "identity fallback" : "skills"}`);
}
async function reindexAgent(agent) {
    console.log(`[Indexer] Re-indexing agent ${agent.agentId}`);
    await indexAgentSkills(agent);
}
async function syncScoreToIndex(agentId, network, camScore) {
    await (0, vector_1.updateVectorScore)(agentId, network, camScore);
}
//# sourceMappingURL=index.js.map