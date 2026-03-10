import axios, { AxiosInstance } from "axios";
import { CeloNetwork } from "../config/env";

const BASE_URL = "https://selfclaw.ai/api/selfclaw/v1";

// ─────────────────────────────────────────
// Response shapes from SelfClaw API
// Based on Section 17 + agent details
// ─────────────────────────────────────────
export interface SelfClawAgentReputation {
  publicKey: string;
  agentName: string;
  totalStakes: number;
  validated: number;
  slashed: number;
  neutral: number;
  reputationScore: number;
  badges: string[];
}

export interface SelfClawAgentDetails {
  verified: boolean;
  publicKey: string;
  humanId: string;
  agentName: string;
  agentDescription: string;
  category: string;
  verifiedAt: string;
  walletAddress: string;
  walletChain: string;
  tokenAddress: string;
  erc8004TokenId: string;
  verificationLevel?: string;
  agentContext?: {
    identity: {
      name: string;
      description: string;
      category: string;
    };
    wallet: {
      address: string;
      chain: string;
    };
    services: SelfClawService[];
    revenue: {
      total: string;
      costs: string;
    };
  };
  pipeline?: {
    verified: boolean;
    walletCreated: boolean;
    tokenDeployed: boolean;
    erc8004Registered: boolean;
    sponsorshipReceived: boolean;
  };
}

export interface SelfClawService {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  endpoint?: string;
  category?: string;
}

export interface SelfClawSkill {
  id: string;
  name: string;
  description: string;
  price: string;
  priceToken: string;        // e.g. "$ZENANDO" — was "currency" before
  category: string;
  agentPublicKey: string;
  avgRating: number;         // new field
  totalPurchases: number;    // new field
  active?: boolean;
  createdAt?: string;
}

export interface SelfClawScore {
  publicKey: string;
  agentName: string;
  score: number;
  grade: string;
  breakdown: {
    identity: { score: number; weight: number; weighted: number };
    social: { score: number; weight: number; weighted: number };
    economy: { score: number; weight: number; weighted: number };
    skills: { score: number; weight: number; weighted: number };
    reputation: { score: number; weight: number; weighted: number };
  };
}

// ─────────────────────────────────────────
// Singleton axios instance — no auth needed
// for Section 17 public endpoints
// ─────────────────────────────────────────
let instance: AxiosInstance | null = null;

// ─────────────────────────────────────────
// Simple TTL cache — avoids hitting SelfClaw
// repeatedly for the same wallet during
// a scoring run (cache expires after 1 hour)
// ─────────────────────────────────────────
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: any): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getClient(): AxiosInstance {
  if (!instance) {
    instance = axios.create({
      baseURL: BASE_URL,
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status !== 404) {
          console.warn(
            `[SelfClaw] API error: ${err.response?.status} ${err.message}`
          );
        }
        return Promise.reject(err);
      }
    );
  }
  return instance;
}

// ─────────────────────────────────────────
// Get agent details by identifier
// Identifier: public key, agent name,
// numeric ID, or wallet address
// ─────────────────────────────────────────
export async function getSelfClawAgent(
  identifier: string
): Promise<SelfClawAgentDetails | null> {
  try {
    const res = await getClient().get<SelfClawAgentDetails>(
      `/agent/${encodeURIComponent(identifier)}`
    );
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    console.warn(
      `[SelfClaw] getSelfClawAgent failed for ${identifier}: ${err.message}`
    );
    return null;
  }
}

// ─────────────────────────────────────────
// Get agent reputation by identifier
// ─────────────────────────────────────────

export async function getSelfClawReputation(
    identifier: string
): Promise<SelfClawAgentReputation | null> {
    const cacheKey = `reputation:${identifier.toLowerCase()}`;
    const cached = cacheGet<SelfClawAgentReputation>(cacheKey);
    if (cached) return cached;

    try {
        const res = await getClient().get<SelfClawAgentReputation>(
            `/agent/${encodeURIComponent(identifier)}/reputation`
        );
        if (res.data) cacheSet(cacheKey, res.data);
        return res.data;
    } catch (err: any) {
        if (err.response?.status === 404) return null;
        console.warn(
            `[SelfClaw] getSelfClawReputation failed for ${identifier}: ${err.message}`
        );
        return null;
    }
}
// ─────────────────────────────────────────
// Get SelfClaw PoC score by public key
// ─────────────────────────────────────────
export async function getSelfClawScore(
  publicKey: string
): Promise<SelfClawScore | null> {
  try {
    const res = await getClient().get<SelfClawScore>(
      `/agent-score/${encodeURIComponent(publicKey)}`
    );
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    console.warn(
      `[SelfClaw] getSelfClawScore failed: ${err.message}`
    );
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
export async function getSelfClawSkills(params?: {
  page?: number;
  limit?: number;
  category?: string;
}): Promise<SelfClawSkill[]> {
  try {
    const res = await getClient().get<{
      skills: SelfClawSkill[];
      total: number;
      page: number;
      limit: number;
    }>("/skills", {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        category: params?.category,
      },
    });
    return res.data?.skills ?? [];
  } catch (err: any) {
    console.warn(`[SelfClaw] getSelfClawSkills failed: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────
// Get skills for a specific agent
// Uses ?agent=<publicKey> filter directly
// instead of client-side name filtering
// ─────────────────────────────────────────
export async function getAgentSelfClawSkills(
  publicKey: string
): Promise<SelfClawSkill[]> {
  const cacheKey = `skills:${publicKey.toLowerCase()}`;
  const cached = cacheGet<SelfClawSkill[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await getClient().get<{
      skills: SelfClawSkill[];
      total: number;
      page: number;
      limit: number;
    }>("/skills", {
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
  } catch (err: any) {
    console.warn(
      `[SelfClaw] getAgentSelfClawSkills failed for ${publicKey}: ${err.message}`
    );
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

export async function getSelfClawAgentByWallet(
    walletAddress: string
): Promise<SelfClawAgentDetails | null> {
    const cacheKey = `agent:${walletAddress.toLowerCase()}`;
    const cached = cacheGet<SelfClawAgentDetails>(cacheKey);
    if (cached) return cached;

    const result = await getSelfClawAgent(walletAddress);
    if (result) cacheSet(cacheKey, result);
    return result;
}

// ─────────────────────────────────────────
// Verification level trust ranking
// Maps SelfClaw verification levels to
// a numeric trust score (0-1)
// ─────────────────────────────────────────
export function getVerificationLevelScore(
  verificationLevel?: string
): number {
  if (!verificationLevel) return 0;

  const levels: Record<string, number> = {
    "talent-human+signature": 1.0,   // strongest — Human Checkmark + key sig
    "talent-human": 0.85,            // Human Checkmark verified
    "talent-passport+signature": 0.7, // Talent profile + key sig
    "talent-passport": 0.55,         // Talent Protocol profile only
    "selfxyz_passport": 0.9,         // Self.xyz ZK passport proof
  };

  return levels[verificationLevel] ?? 0.3; // unknown level = small bonus
}

// ─────────────────────────────────────────
// Map SelfClaw skill categories to our
// CAM SkillCategory enum values
// ─────────────────────────────────────────
export function mapSelfClawCategory(
  selfClawCategory: string
): string {
  const categoryMap: Record<string, string> = {
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
export async function pingSelfClaw(): Promise<boolean> {
  try {
    await getClient().get("/health");
    return true;
  } catch {
    return false;
  }
}

