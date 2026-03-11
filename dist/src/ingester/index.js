"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexAgentSkills = indexAgentSkills;
exports.reindexAgent = reindexAgent;
exports.syncScoreToIndex = syncScoreToIndex;
exports.startIngester = startIngester;
const skillParser_1 = require("../indexer/skillParser");
const embeddings_1 = require("../indexer/embeddings");
const vector_1 = require("../indexer/vector");
const scan8004_1 = require("../lib/scan8004");
const selfclaw_1 = require("../lib/selfclaw");
const metadata_1 = require("./metadata");
const registry_1 = require("./registry");
async function indexAgentSkills(agent) {
    // ─────────────────────────────────────
    // Source 1: skill.md
    // Already parsed and stored in agent.skills
    // ─────────────────────────────────────
    const skillMdSkills = agent.skills ?? [];
    // ─────────────────────────────────────
    // Source 2: OASF skills from metadata
    // Extracted from services[].skills array
    // in the agent's on-chain metadata JSON
    // ─────────────────────────────────────
    let oasfSkills = [];
    if (agent.rawMetadata) {
        try {
            const oasfNames = (0, metadata_1.extractOASFSkills)(agent.rawMetadata);
            if (oasfNames.length > 0) {
                oasfSkills = oasfNames.map((name) => ({
                    name,
                    description: "",
                    category: "other",
                    inputTypes: [],
                    outputTypes: [],
                    version: "oasf",
                }));
                console.log(`[Indexer] Found ${oasfSkills.length} OASF skill(s) for agent ${agent.agentId}`);
            }
        }
        catch {
            // OASF extraction failed — continue
        }
    }
    // ─────────────────────────────────────
    // Source 3: SelfClaw skill marketplace
    // Look up by wallet → publicKey → skills
    // ─────────────────────────────────────
    let selfClawParsedSkills = [];
    try {
        const selfClawAgent = await (0, selfclaw_1.getSelfClawAgentByWallet)(agent.walletAddress);
        if (selfClawAgent?.publicKey) {
            const selfClawSkills = await (0, selfclaw_1.getAgentSelfClawSkills)(selfClawAgent.publicKey // ← publicKey not agentName
            );
            selfClawParsedSkills = (0, skillParser_1.parseSelfClawSkills)(selfClawSkills);
            if (selfClawParsedSkills.length > 0) {
                console.log(`[Indexer] Found ${selfClawParsedSkills.length} SelfClaw skill(s) for agent ${agent.agentId}`);
            }
        }
    }
    catch {
        // SelfClaw lookup failed — continue
    }
    // ─────────────────────────────────────
    // Source 4: Protocol-inferred skills
    // from 8004scan supported_protocols
    // Also checks metadata services array
    // ─────────────────────────────────────
    let protocolSkills = [];
    try {
        // First try metadata services directly
        if (agent.rawMetadata?.services?.length) {
            const protocols = (0, metadata_1.extractProtocols)(agent.rawMetadata);
            if (protocols.length > 0) {
                protocolSkills = (0, skillParser_1.inferSkillsFromProtocols)(protocols);
            }
        }
        // Fall back to 8004scan if no protocols from metadata
        if (protocolSkills.length === 0) {
            const scan8004Agent = await (0, scan8004_1.getAgent)(agent.agentId, agent.network);
            if (scan8004Agent?.supported_protocols?.length) {
                protocolSkills = (0, skillParser_1.inferSkillsFromProtocols)(scan8004Agent.supported_protocols);
            }
        }
        if (protocolSkills.length > 0) {
            console.log(`[Indexer] Inferred ${protocolSkills.length} skill(s) from protocols for agent ${agent.agentId}`);
        }
    }
    catch {
        // Protocol lookup failed — continue
    }
    // ─────────────────────────────────────
    // Merge all four sources
    // Priority: skill.md > OASF > SelfClaw > protocol
    // ─────────────────────────────────────
    const mergedSkills = (0, skillParser_1.mergeSkillSources)(skillMdSkills, [...oasfSkills, ...selfClawParsedSkills], protocolSkills);
    // ─────────────────────────────────────
    // Build embedding text
    // Fall back to agent identity if no skills
    // so agent still appears in discovery
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
        console.log(`[Indexer] Agent ${agent.agentId} has no skills — indexing from identity only`);
    }
    else {
        console.log(`[Indexer] Agent ${agent.agentId} — ` +
            `${skillMdSkills.length} skill.md, ` +
            `${oasfSkills.length} OASF, ` +
            `${selfClawParsedSkills.length} SelfClaw, ` +
            `${protocolSkills.length} inferred`);
    }
    // ─────────────────────────────────────
    // Resolve x402 endpoint from metadata
    // if not already set on the agent record
    // ─────────────────────────────────────
    const x402Endpoint = agent.x402Endpoint ??
        (agent.rawMetadata ? (0, metadata_1.extractX402Endpoint)(agent.rawMetadata) : null);
    // ─────────────────────────────────────
    // Generate embedding and store in pgvector
    // ─────────────────────────────────────
    const embedding = await (0, embeddings_1.generateEmbedding)(embeddingText);
    await (0, vector_1.upsertSkillVector)(agent.agentId, agent.network, embedding, {
        name: agent.name,
        skills: mergedSkills.map((s) => s.name),
        categories: [...new Set(mergedSkills.map((s) => s.category))],
        x402Endpoint,
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
function startIngester() {
    console.log("[Ingester] Starting...");
    const stopWatchers = (0, registry_1.startRegistryWatchers)();
    console.log("[Ingester] Running — listening for new agents on mainnet & testnet");
    return () => {
        stopWatchers();
        console.log("[Ingester] Stopped");
    };
}
//# sourceMappingURL=index.js.map