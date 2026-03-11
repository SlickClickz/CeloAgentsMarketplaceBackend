"use strict";
// import axios, { AxiosInstance } from "axios";
// import { env, CeloNetwork, chainRegistry } from "../config/env";
// import {
//   Scan8004Agent,
//   Scan8004AgentResponse,
//   Scan8004AgentListResponse,
//   Scan8004StatsResponse,
//   Scan8004ChainsResponse,
// } from "../types/erc8004";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgent = getAgent;
exports.listAgents = listAgents;
exports.searchAgents = searchAgents;
exports.getAgentsByOwner = getAgentsByOwner;
exports.getPlatformStats = getPlatformStats;
exports.getSupportedChains = getSupportedChains;
exports.listFeedbacks = listFeedbacks;
// const BASE_URL = "https://www.8004scan.io/api/v1/public";
// const scan8004Cache = new Map <
//   string,
//   { data: any; expiresAt: number }
// >();
// const SCAN_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
// function scan8004CacheGet<T>(key: string): T | null {
//   const entry = scan8004Cache.get(key);
//   if (!entry) return null;
//   if (Date.now() > entry.expiresAt) {
//     scan8004Cache.delete(key);
//     return null;
//   }
//   return entry.data as T;
// }
// function scan8004CacheSet(key: string, data: any): void {
//   scan8004Cache.set(key, {
//     data,
//     expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
//   });
// }
// // ─────────────────────────────────────────
// // Singleton axios instance with auth header
// // ─────────────────────────────────────────
// let instance: AxiosInstance | null = null;
// function getClient(): AxiosInstance {
//   if (!instance) {
//     instance = axios.create({
//       baseURL: BASE_URL,
//       timeout: 20000,
//       headers: {
//         "Content-Type": "application/json",
//         ...(env.scan8004ApiKey
//           ? { "X-API-Key": env.scan8004ApiKey }
//           : {}),
//       },
//     });
//     // Response interceptor — log rate limit headers
//     instance.interceptors.response.use(
//       (res) => {
//         const remaining = res.headers["x-ratelimit-remaining"];
//         if (remaining && Number(remaining) < 5) {
//           console.warn(
//             `[8004scan] Rate limit low: ${remaining} requests remaining`
//           );
//         }
//         return res;
//       },
//       (err) => {
//         if (err.response?.status === 429) {
//           const reset = err.response.headers["x-ratelimit-reset"];
//           console.error(`[8004scan] Rate limited. Resets at: ${reset}`);
//         }
//         return Promise.reject(err);
//       }
//     );
//   }
//   return instance;
// }
// // ─────────────────────────────────────────
// // Resolve chainId from our CeloNetwork type
// // Celo Mainnet = 42220
// // Celo Alfajores = 44787
// // ─────────────────────────────────────────
// function getChainId(network: CeloNetwork): number {
//   return chainRegistry[network].chainId;
// }
// // ─────────────────────────────────────────
// // Get a single agent by chainId + tokenId
// // GET /agents/{chainId}/{tokenId}
// // ─────────────────────────────────────────
// // export async function getAgent(
// //   tokenId: number | string,
// //   network: CeloNetwork
// // ): Promise<Scan8004Agent | null> {
// //   const chainId = getChainId(network);
// //   try {
// //     const res = await getClient().get<Scan8004AgentResponse>(
// //       `/agents/${chainId}/${tokenId}`
// //     );
// //     if (!res.data.success || !res.data.data) return null;
// //     return res.data.data;
// //   } catch (err: any) {
// //     if (err.response?.status === 404) return null;
// //     console.warn(
// //       `[8004scan] getAgent failed for tokenId=${tokenId} chainId=${chainId}: ${err.message}`
// //     );
// //     return null;
// //   }
// // }
// export async function getAgent(
//   tokenId: number | string,
//   network: CeloNetwork
// ): Promise<Scan8004Agent | null> {
//   const chainId = getChainId(network);
//   const cacheKey = `agent:${chainId}:${tokenId}`;
//   const cached = scan8004CacheGet<Scan8004Agent>(cacheKey);
//   if (cached) return cached;
//   try {
//     const res = await getClient().get<Scan8004AgentResponse>(
//       `/agents/${chainId}/${tokenId}`
//     );
//     if (!res.data.success || !res.data.data) return null;
//     scan8004CacheSet(cacheKey, res.data.data);
//     return res.data.data;
//   } catch (err: any) {
//     if (err.response?.status === 404) return null;
//     console.warn(
//       `[8004scan] getAgent failed for tokenId=${tokenId} chainId=${chainId}: ${err.message}`
//     );
//     return null;
//   }
// }
// // ─────────────────────────────────────────
// // List agents with optional filters
// // GET /agents
// // ─────────────────────────────────────────
// export async function listAgents(params: {
//   network: CeloNetwork;
//   page?: number;
//   limit?: number;
//   ownerAddress?: string;
//   search?: string;
//   sortBy?: "created_at" | "stars" | "name" | "token_id" | "total_score";
//   sortOrder?: "asc" | "desc";
// }): Promise<{ agents: Scan8004Agent[]; hasMore: boolean; total: number }> {
//   const chainId = getChainId(params.network);
//   try {
//     const res = await getClient().get<Scan8004AgentListResponse>("/agents", {
//       params: {
//         chainId,
//         page: params.page ?? 1,
//         limit: params.limit ?? 20,
//         ownerAddress: params.ownerAddress,
//         search: params.search,
//         sortBy: params.sortBy ?? "created_at",
//         sortOrder: params.sortOrder ?? "desc",
//         isTestnet: params.network === "testnet",
//       },
//     });
//     if (!res.data.success) {
//       return { agents: [], hasMore: false, total: 0 };
//     }
//     return {
//       agents: res.data.data,
//       hasMore: res.data.meta.pagination?.hasMore ?? false,
//       total: res.data.meta.pagination?.total ?? 0,
//     };
//   } catch (err: any) {
//     console.warn(`[8004scan] listAgents failed: ${err.message}`);
//     return { agents: [], hasMore: false, total: 0 };
//   }
// }
// // ─────────────────────────────────────────
// // Semantic search — 8004scan has its own
// // vector search we can use as a secondary
// // signal alongside our ChromaDB search
// // GET /agents/search
// // ─────────────────────────────────────────
// export async function searchAgents(params: {
//   query: string;
//   network: CeloNetwork;
//   limit?: number;
//   semanticWeight?: number; // 0 = keyword only, 1 = semantic only
// }): Promise<Scan8004Agent[]> {
//   const chainId = getChainId(params.network);
//   try {
//     const res = await getClient().get<Scan8004AgentListResponse>(
//       "/agents/search",
//       {
//         params: {
//           q: params.query,
//           chainId,
//           limit: params.limit ?? 20,
//           semanticWeight: params.semanticWeight ?? 0.5,
//         },
//       }
//     );
//     if (!res.data.success) return [];
//     return res.data.data;
//   } catch (err: any) {
//     console.warn(`[8004scan] searchAgents failed: ${err.message}`);
//     return [];
//   }
// }
// // ─────────────────────────────────────────
// // Get all agents owned by a wallet
// // GET /accounts/{address}/agents
// // ─────────────────────────────────────────
// export async function getAgentsByOwner(
//   ownerAddress: string,
//   network: CeloNetwork,
//   page = 1,
//   limit = 20
// ): Promise<Scan8004Agent[]> {
//   try {
//     const res = await getClient().get<Scan8004AgentListResponse>(
//       `/accounts/${ownerAddress}/agents`,
//       { params: { page, limit } }
//     );
//     if (!res.data.success) return [];
//     return res.data.data;
//   } catch (err: any) {
//     console.warn(
//       `[8004scan] getAgentsByOwner failed for ${ownerAddress}: ${err.message}`
//     );
//     return [];
//   }
// }
// // ─────────────────────────────────────────
// // Platform stats
// // GET /stats
// // ─────────────────────────────────────────
// export async function getPlatformStats(): Promise <
//   Scan8004StatsResponse["data"] | null
// > {
//   try {
//     const res = await getClient().get<Scan8004StatsResponse>("/stats");
//     if (!res.data.success) return null;
//     return res.data.data;
//   } catch (err: any) {
//     console.warn(`[8004scan] getPlatformStats failed: ${err.message}`);
//     return null;
//   }
// }
// // ─────────────────────────────────────────
// // List supported chains
// // GET /chains
// // Useful for validating our chainId values
// // ─────────────────────────────────────────
// export async function getSupportedChains(): Promise <
//   Scan8004ChainsResponse["data"]
// > {
//   try {
//     const res = await getClient().get<Scan8004ChainsResponse>("/chains");
//     if (!res.data.success) return [];
//     return res.data.data;
//   } catch (err: any) {
//     console.warn(`[8004scan] getSupportedChains failed: ${err.message}`);
//     return [];
//   }
// }
// // ─────────────────────────────────────────
// // List feedbacks for a specific agent
// // GET /feedbacks?chainId=...&tokenId=...
// // ─────────────────────────────────────────
// // export async function listFeedbacks(params: {
// //   network: CeloNetwork;
// //   tokenId: number;
// //   limit?: number;
// //   minScore?: number;
// // }): Promise<{ score: number; comment: string; created_at: string }[]> {
// //   const chainId = getChainId(params.network);
// //   try {
// //     const res = await getClient().get<{
// //       success: boolean;
// //       data: { score: number; comment: string; created_at: string }[];
// //     }>("/feedbacks", {
// //       params: {
// //         chainId,
// //         tokenId: params.tokenId,
// //         limit: params.limit ?? 50,
// //         minScore: params.minScore,
// //       },
// //     });
// //     if (!res.data.success) return [];
// //     return res.data.data;
// //   } catch (err: any) {
// //     console.warn(
// //       `[8004scan] listFeedbacks failed for tokenId=${params.tokenId}: ${err.message}`
// //     );
// //     return [];
// //   }
// // }
// export async function listFeedbacks(params: {
//   network: CeloNetwork;
//   tokenId: number;
//   limit?: number;
//   minScore?: number;
// }): Promise<{ score: number; comment: string; created_at: string }[]> {
//   const chainId = getChainId(params.network);
//   const cacheKey = `feedbacks:${chainId}:${params.tokenId}`;
//   const cached = scan8004CacheGet <
//     { score: number; comment: string; created_at: string }[]
//   >(cacheKey);
//   if (cached) return cached;
//   try {
//     const res = await getClient().get<{
//       success: boolean;
//       data: { score: number; comment: string; created_at: string }[];
//     }>("/feedbacks", {
//       params: {
//         chainId,
//         tokenId: params.tokenId,
//         limit: params.limit ?? 50,
//         minScore: params.minScore,
//       },
//     });
//     if (!res.data.success) return [];
//     scan8004CacheSet(cacheKey, res.data.data);
//     return res.data.data;
//   } catch (err: any) {
//     console.warn(
//       `[8004scan] listFeedbacks failed for tokenId=${params.tokenId}: ${err.message}`
//     );
//     return [];
//   }
// }
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const BASE_URL = "https://www.8004scan.io/api/v1/public";
const scan8004Cache = new Map();
const SCAN_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
function scan8004CacheGet(key) {
    const entry = scan8004Cache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        scan8004Cache.delete(key);
        return null;
    }
    return entry.data;
}
function scan8004CacheSet(key, data) {
    scan8004Cache.set(key, {
        data,
        expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
    });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ─────────────────────────────────────────
// Retry with exponential backoff
// Handles 429 rate limits and timeouts
// ─────────────────────────────────────────
async function withBackoff(fn, retries = 4, baseDelayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            const is429 = err.response?.status === 429;
            const isTimeout = err.code === "ECONNABORTED" || err.message?.includes("timeout");
            if ((is429 || isTimeout) && attempt < retries) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                const reset = err.response?.headers?.["x-ratelimit-reset"];
                const waitMs = reset
                    ? Math.max(0, new Date(reset).getTime() - Date.now()) + 500
                    : delay;
                console.warn(`[8004scan] ${is429 ? "Rate limited" : "Timeout"} — ` +
                    `waiting ${waitMs}ms before retry ${attempt}/${retries}`);
                await sleep(waitMs);
                continue;
            }
            throw err;
        }
    }
    throw new Error("[8004scan] withBackoff exhausted all retries");
}
// ─────────────────────────────────────────
// Singleton axios instance with auth header
// ─────────────────────────────────────────
let instance = null;
function getClient() {
    if (!instance) {
        instance = axios_1.default.create({
            baseURL: BASE_URL,
            timeout: 20000,
            headers: {
                "Content-Type": "application/json",
                ...(env_1.env.scan8004ApiKey
                    ? { "X-API-Key": env_1.env.scan8004ApiKey }
                    : {}),
            },
        });
        // Response interceptor — log rate limit headers
        instance.interceptors.response.use((res) => {
            const remaining = res.headers["x-ratelimit-remaining"];
            if (remaining && Number(remaining) < 5) {
                console.warn(`[8004scan] Rate limit low: ${remaining} requests remaining`);
            }
            return res;
        }, (err) => {
            if (err.response?.status === 429) {
                const reset = err.response.headers["x-ratelimit-reset"];
                console.error(`[8004scan] Rate limited. Resets at: ${reset}`);
            }
            return Promise.reject(err);
        });
    }
    return instance;
}
// ─────────────────────────────────────────
// Resolve chainId from CeloNetwork type
// ─────────────────────────────────────────
function getChainId(network) {
    return env_1.chainRegistry[network].chainId;
}
// ─────────────────────────────────────────
// Get a single agent by chainId + tokenId
// ─────────────────────────────────────────
async function getAgent(tokenId, network) {
    const chainId = getChainId(network);
    const cacheKey = `agent:${chainId}:${tokenId}`;
    const cached = scan8004CacheGet(cacheKey);
    if (cached)
        return cached;
    try {
        return await withBackoff(async () => {
            const res = await getClient().get(`/agents/${chainId}/${tokenId}`);
            if (!res.data.success || !res.data.data)
                return null;
            scan8004CacheSet(cacheKey, res.data.data);
            return res.data.data;
        });
    }
    catch (err) {
        if (err.response?.status === 404)
            return null;
        console.warn(`[8004scan] getAgent failed for tokenId=${tokenId} chainId=${chainId}: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────
// List agents with optional filters
// ─────────────────────────────────────────
async function listAgents(params) {
    const chainId = getChainId(params.network);
    try {
        return await withBackoff(async () => {
            const res = await getClient().get("/agents", {
                params: {
                    chainId,
                    page: params.page ?? 1,
                    limit: params.limit ?? 20,
                    ownerAddress: params.ownerAddress,
                    search: params.search,
                    sortBy: params.sortBy ?? "created_at",
                    sortOrder: params.sortOrder ?? "desc",
                    isTestnet: params.network === "testnet",
                },
            });
            if (!res.data.success) {
                return { agents: [], hasMore: false, total: 0 };
            }
            return {
                agents: res.data.data,
                hasMore: res.data.meta.pagination?.hasMore ?? false,
                total: res.data.meta.pagination?.total ?? 0,
            };
        });
    }
    catch (err) {
        console.warn(`[8004scan] listAgents failed: ${err.message}`);
        return { agents: [], hasMore: false, total: 0 };
    }
}
// ─────────────────────────────────────────
// Semantic search
// ─────────────────────────────────────────
async function searchAgents(params) {
    const chainId = getChainId(params.network);
    try {
        return await withBackoff(async () => {
            const res = await getClient().get("/agents/search", {
                params: {
                    q: params.query,
                    chainId,
                    limit: params.limit ?? 20,
                    semanticWeight: params.semanticWeight ?? 0.5,
                },
            });
            if (!res.data.success)
                return [];
            return res.data.data;
        });
    }
    catch (err) {
        console.warn(`[8004scan] searchAgents failed: ${err.message}`);
        return [];
    }
}
// ─────────────────────────────────────────
// Get all agents owned by a wallet
// ─────────────────────────────────────────
async function getAgentsByOwner(ownerAddress, network, page = 1, limit = 20) {
    try {
        return await withBackoff(async () => {
            const res = await getClient().get(`/accounts/${ownerAddress}/agents`, { params: { page, limit } });
            if (!res.data.success)
                return [];
            return res.data.data;
        });
    }
    catch (err) {
        console.warn(`[8004scan] getAgentsByOwner failed for ${ownerAddress}: ${err.message}`);
        return [];
    }
}
// ─────────────────────────────────────────
// Platform stats
// ─────────────────────────────────────────
async function getPlatformStats() {
    try {
        const res = await getClient().get("/stats");
        if (!res.data.success)
            return null;
        return res.data.data;
    }
    catch (err) {
        console.warn(`[8004scan] getPlatformStats failed: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────
// List supported chains
// ─────────────────────────────────────────
async function getSupportedChains() {
    try {
        const res = await getClient().get("/chains");
        if (!res.data.success)
            return [];
        return res.data.data;
    }
    catch (err) {
        console.warn(`[8004scan] getSupportedChains failed: ${err.message}`);
        return [];
    }
}
// ─────────────────────────────────────────
// List feedbacks for a specific agent
// ─────────────────────────────────────────
async function listFeedbacks(params) {
    const chainId = getChainId(params.network);
    const cacheKey = `feedbacks:${chainId}:${params.tokenId}`;
    const cached = scan8004CacheGet(cacheKey);
    if (cached)
        return cached;
    try {
        return await withBackoff(async () => {
            const res = await getClient().get("/feedbacks", {
                params: {
                    chainId,
                    tokenId: params.tokenId,
                    limit: params.limit ?? 50,
                    minScore: params.minScore,
                },
            });
            if (!res.data.success)
                return [];
            scan8004CacheSet(cacheKey, res.data.data);
            return res.data.data;
        });
    }
    catch (err) {
        console.warn(`[8004scan] listFeedbacks failed for tokenId=${params.tokenId}: ${err.message}`);
        return [];
    }
}
//# sourceMappingURL=scan8004.js.map