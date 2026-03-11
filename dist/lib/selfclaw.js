"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelfClawAgent = getSelfClawAgent;
exports.getSelfClawReputation = getSelfClawReputation;
exports.getSelfClawScore = getSelfClawScore;
exports.getSelfClawSkills = getSelfClawSkills;
exports.getAgentSelfClawSkills = getAgentSelfClawSkills;
exports.getSelfClawAgentByWallet = getSelfClawAgentByWallet;
exports.getVerificationLevelScore = getVerificationLevelScore;
exports.mapSelfClawCategory = mapSelfClawCategory;
exports.pingSelfClaw = pingSelfClaw;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = "https://selfclaw.ai/api/selfclaw/v1";
// ─────────────────────────────────────────
// Singleton axios instance — no auth needed
// for Section 17 public endpoints
// ─────────────────────────────────────────
let instance = null;
// ─────────────────────────────────────────
// Simple TTL cache — avoids hitting SelfClaw
// repeatedly for the same wallet during
// a scoring run (cache expires after 1 hour)
// ─────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function cacheSet(key, data) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
function getClient() {
    if (!instance) {
        instance = axios_1.default.create({
            baseURL: BASE_URL,
            timeout: 20000,
            headers: {
                "Content-Type": "application/json",
            },
        });
        instance.interceptors.response.use((res) => res, (err) => {
            if (err.response?.status !== 404) {
                console.warn(`[SelfClaw] API error: ${err.response?.status} ${err.message}`);
            }
            return Promise.reject(err);
        });
    }
    return instance;
}
// ─────────────────────────────────────────
// Get agent details by identifier
// Identifier: public key, agent name,
// numeric ID, or wallet address
// ─────────────────────────────────────────
async function getSelfClawAgent(identifier) {
    try {
        const res = await getClient().get(`/agent/${encodeURIComponent(identifier)}`);
        return res.data;
    }
    catch (err) {
        if (err.response?.status === 404)
            return null;
        console.warn(`[SelfClaw] getSelfClawAgent failed for ${identifier}: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────
// Get agent reputation by identifier
// ─────────────────────────────────────────
async function getSelfClawReputation(identifier) {
    const cacheKey = `reputation:${identifier.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached)
        return cached;
    try {
        const res = await getClient().get(`/agent/${encodeURIComponent(identifier)}/reputation`);
        if (res.data)
            cacheSet(cacheKey, res.data);
        return res.data;
    }
    catch (err) {
        if (err.response?.status === 404)
            return null;
        console.warn(`[SelfClaw] getSelfClawReputation failed for ${identifier}: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────
// Get SelfClaw PoC score by public key
// ─────────────────────────────────────────
async function getSelfClawScore(publicKey) {
    try {
        const res = await getClient().get(`/agent-score/${encodeURIComponent(publicKey)}`);
        return res.data;
    }
    catch (err) {
        if (err.response?.status === 404)
            return null;
        console.warn(`[SelfClaw] getSelfClawScore failed: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────
// Browse public skill marketplace
// Returns skills published by agents
// These are declared + priced capabilities
// ─────────────────────────────────────────
// export async function getSelfClawSkills(params?: {
//   page?: number;
//   limit?: number;
//   category?: string;
// }): Promise<SelfClawSkill[]> {
//   try {
//     const res = await getClient().get<{
//       skills: SelfClawSkill[];
//       total: number;
//     }>("/skills", {
//       params: {
//         page: params?.page ?? 1,
//         limit: params?.limit ?? 50,
//         category: params?.category,
//       },
//     });
//     return res.data?.skills ?? [];
//   } catch (err: any) {
//     console.warn(`[SelfClaw] getSelfClawSkills failed: ${err.message}`);
//     return [];
//   }
// }
// // ─────────────────────────────────────────
// // Get skills published by a specific agent
// // by filtering the marketplace by agent name
// // ─────────────────────────────────────────
// export async function getAgentSelfClawSkills(
//   agentName: string
// ): Promise<SelfClawSkill[]> {
//   try {
//     const allSkills = await getSelfClawSkills({ limit: 100 });
//     return allSkills.filter(
//       (s) => s.agentName?.toLowerCase() === agentName.toLowerCase()
//     );
//   } catch (err: any) {
//     console.warn(
//       `[SelfClaw] getAgentSelfClawSkills failed for ${agentName}: ${err.message}`
//     );
//     return [];
//   }
// }
async function getSelfClawSkills(params) {
    try {
        const res = await getClient().get("/skills", {
            params: {
                page: params?.page ?? 1,
                limit: params?.limit ?? 50,
                category: params?.category,
            },
        });
        return res.data?.skills ?? [];
    }
    catch (err) {
        console.warn(`[SelfClaw] getSelfClawSkills failed: ${err.message}`);
        return [];
    }
}
// ─────────────────────────────────────────
// Get skills for a specific agent
// Uses ?agent=<publicKey> filter directly
// instead of client-side name filtering
// ─────────────────────────────────────────
async function getAgentSelfClawSkills(publicKey) {
    const cacheKey = `skills:${publicKey.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached)
        return cached;
    try {
        const res = await getClient().get("/skills", {
            params: {
                agent: publicKey,
                limit: 50,
            },
        });
        const skills = res.data?.skills ?? [];
        if (skills.length > 0) {
            cacheSet(cacheKey, skills);
        }
        return skills;
    }
    catch (err) {
        console.warn(`[SelfClaw] getAgentSelfClawSkills failed for ${publicKey}: ${err.message}`);
        return [];
    }
}
// ─────────────────────────────────────────
// Lookup agent by wallet address
// Uses wallet address as the identifier
// since that's what we have from 8004scan
// ─────────────────────────────────────────
// export async function getSelfClawAgentByWallet(
//   walletAddress: string
// ): Promise<SelfClawAgentDetails | null> {
//   return getSelfClawAgent(walletAddress);
// }
async function getSelfClawAgentByWallet(walletAddress) {
    const cacheKey = `agent:${walletAddress.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached)
        return cached;
    const result = await getSelfClawAgent(walletAddress);
    if (result)
        cacheSet(cacheKey, result);
    return result;
}
// ─────────────────────────────────────────
// Verification level trust ranking
// Maps SelfClaw verification levels to
// a numeric trust score (0-1)
// ─────────────────────────────────────────
function getVerificationLevelScore(verificationLevel) {
    if (!verificationLevel)
        return 0;
    const levels = {
        "talent-human+signature": 1.0, // strongest — Human Checkmark + key sig
        "talent-human": 0.85, // Human Checkmark verified
        "talent-passport+signature": 0.7, // Talent profile + key sig
        "talent-passport": 0.55, // Talent Protocol profile only
        "selfxyz_passport": 0.9, // Self.xyz ZK passport proof
    };
    return levels[verificationLevel] ?? 0.3; // unknown level = small bonus
}
// ─────────────────────────────────────────
// Map SelfClaw skill categories to our
// CAM SkillCategory enum values
// ─────────────────────────────────────────
function mapSelfClawCategory(selfClawCategory) {
    const categoryMap = {
        research: "data-oracle",
        analysis: "data-oracle",
        monitoring: "data-oracle",
        consulting: "other",
        content: "other",
        translation: "other",
        development: "other",
        defi: "yield-optimization",
        trading: "token-swap",
        payment: "payment-automation",
        nft: "nft-management",
        governance: "governance",
        bridge: "cross-chain-transfer",
        savings: "stablecoin-savings",
    };
    const lower = selfClawCategory?.toLowerCase() ?? "";
    return categoryMap[lower] ?? "other";
}
// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────
async function pingSelfClaw() {
    try {
        await getClient().get("/health");
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=selfclaw.js.map