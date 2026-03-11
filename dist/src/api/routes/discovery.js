"use strict";
// import { Router, Request, Response, NextFunction } from "express";
// import { z } from "zod";
// import { generateEmbedding } from "../../indexer/embeddings";
// import { querySkillVectors } from "../../indexer/vector";
// import { getAgentsWithScores } from "../../db/client";
// import { searchAgents } from "../../lib/scan8004";
// import { CAMApiResponse, DiscoveryResult, NetworkMeta } from "../../types/agent";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// const router = Router();
// const discoveryQuerySchema = z.object({
//   query: z.string().min(1).max(500),
//   limit: z.coerce.number().min(1).max(50).default(10),
//   minScore: z.coerce.number().min(0).max(100).optional(),
//   category: z.string().optional(),
//   externalWeight: z.coerce.number().min(0).max(1).default(0.3),
// });
// function mergeAndRankResults(
//   camResults: { agentId: string; distance: number }[],
//   externalResults: { agentId: string; externalRank: number }[],
//   externalWeight: number
// ): { agentId: string; blendedScore: number }[] {
//   const camWeight = 1 - externalWeight;
//   const camRankMap = new Map(
//     camResults.map((r, i) => [
//       r.agentId,
//       {
//         normalizedRank: 1 - i / Math.max(camResults.length, 1),
//         similarity: 1 - r.distance / 2,
//       },
//     ])
//   );
//   const externalRankMap = new Map(
//     externalResults.map((r) => [
//       r.agentId,
//       {
//         normalizedRank:
//           1 - r.externalRank / Math.max(externalResults.length, 1),
//       },
//     ])
//   );
//   const allAgentIds = new Set([
//     ...camResults.map((r) => r.agentId),
//     ...externalResults.map((r) => r.agentId),
//   ]);
//   const blended: { agentId: string; blendedScore: number }[] = [];
//   for (const agentId of allAgentIds) {
//     const cam = camRankMap.get(agentId);
//     const ext = externalRankMap.get(agentId);
//     const camScore = cam
//       ? (cam.normalizedRank * 0.7 + cam.similarity * 0.3) * camWeight
//       : 0;
//     const extScore = ext ? ext.normalizedRank * externalWeight : 0;
//     const agreementBonus = cam && ext ? 0.1 : 0;
//     blended.push({
//       agentId,
//       blendedScore: camScore + extScore + agreementBonus,
//     });
//   }
//   return blended.sort((a, b) => b.blendedScore - a.blendedScore);
// }
// // ─────────────────────────────────────────
// // GET /api/v1/discovery
// // ─────────────────────────────────────────
// router.get(
//   "/",
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const parsed = discoveryQuerySchema.safeParse(req.query);
//       if (!parsed.success) {
//         res.status(400).json({
//           error: {
//             code: "INVALID_PARAMS",
//             message: "Invalid query parameters",
//             details: parsed.error.flatten().fieldErrors,
//           },
//         });
//         return;
//       }
//       const { query, limit, minScore, category, externalWeight } =
//         parsed.data;
//       const { network, chain } = req;
//       // Run both searches in parallel
//       const [queryEmbedding, externalSearchResults] = await Promise.all([
//         generateEmbedding(query),
//         searchAgents({
//           query,
//           network,
//           limit: limit * 2,
//           semanticWeight: 0.7,
//         }),
//       ]);
//       // pgvector semantic search
//       const vectorResults = await querySkillVectors(
//         network,
//         queryEmbedding,
//         limit * 2,
//         minScore
//       );
//       // Merge and rank
//       const externalForMerge = externalSearchResults.map((a, i) => ({
//         agentId: a.token_id.toString(),
//         externalRank: i,
//       }));
//       const merged = mergeAndRankResults(
//         vectorResults,
//         externalForMerge,
//         externalWeight
//       );
//       if (merged.length === 0) {
//         res.json({
//           data: [],
//           meta: buildNetworkMeta(network, chain),
//           timestamp: new Date().toISOString(),
//         });
//         return;
//       }
//       const mergedAgentIds = merged.map((r) => r.agentId);
//       const agents = await getAgentsWithScores(
//         network,
//         mergedAgentIds,
//         minScore
//       );
//       // Filter by category
//       const filtered = category
//         ? agents.filter((a) =>
//             a.skills.some((s: any) => s.category === category)
//           )
//         : agents;
//       // Final sort — CAM Score primary, blended relevance tiebreaker
//       const blendedScoreMap = new Map(
//         merged.map((r) => [r.agentId, r.blendedScore])
//       );
//       const sorted = filtered
//         .sort((a, b) => {
//           const camScoreDiff =
//             (b.score?.total ?? 0) - (a.score?.total ?? 0);
//           if (Math.abs(camScoreDiff) > 5) return camScoreDiff;
//           return (
//             (blendedScoreMap.get(b.agentId) ?? 0) -
//             (blendedScoreMap.get(a.agentId) ?? 0)
//           );
//         })
//         .slice(0, limit);
//       // Shape response — include skill confidence in results
//       const results: DiscoveryResult[] = sorted.map((a) => ({
//         agentId: a.agentId,
//         name: a.name,
//         description: a.description,
//         // Enrich skills with source + confidence
//         skills: a.skills.map((skill: any) => ({
//           ...skill,
//           source:
//             skill.version === "selfclaw"
//               ? "selfclaw"
//               : skill.version === "inferred"
//               ? "protocol"
//               : "skill.md",
//           confidence:
//             skill.version === "selfclaw"
//               ? "medium"
//               : skill.version === "inferred"
//               ? "low"
//               : "high",
//         })),
//         camScore: a.score?.total ?? 0,
//         breakdown: {
//           identity: a.score?.breakdown?.identity ?? 0,
//           execution: a.score?.breakdown?.execution ?? 0,
//           skillIntegrity: a.score?.breakdown?.skillIntegrity ?? 0,
//         },
//         flags: a.flags,
//         x402Endpoint: a.x402Endpoint,
//         network,
//         chain: {
//           chainId: chain.chainId,
//           name: chain.name,
//           blockExplorer: chain.blockExplorer,
//           isTestnet: chain.isTestnet,
//           stablecoins: chain.stablecoins,
//         },
//         // Relevance metadata — useful for frontend
//         relevance: {
//           blendedScore: blendedScoreMap.get(a.agentId) ?? 0,
//           inVectorIndex: vectorResults.some(
//             (r) => r.agentId === a.agentId
//           ),
//           inExternalSearch: externalForMerge.some(
//             (r) => r.agentId === a.agentId
//           ),
//           agreementBonus:
//             vectorResults.some((r) => r.agentId === a.agentId) &&
//             externalForMerge.some((r) => r.agentId === a.agentId),
//         },
//         lastActive: null,
//         registrationTimestamp: a.registrationTimestamp,
//         blockExplorerUrl: `${chain.blockExplorer}/token/${a.agentId}`,
//       }));
//       const response: CAMApiResponse<DiscoveryResult[]> = {
//         data: results,
//         meta: buildNetworkMeta(network, chain),
//         timestamp: new Date().toISOString(),
//       };
//       res.json(response);
//     } catch (err) {
//       next(err);
//     }
//   }
// );
// // ─────────────────────────────────────────
// // GET /api/v1/discovery/external
// // Proxy to 8004scan search directly
// // ─────────────────────────────────────────
// router.get(
//   "/external",
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const query = req.query.query as string;
//       const limit = Math.min(Number(req.query.limit ?? 10), 50);
//       if (!query?.trim()) {
//         res.status(400).json({
//           error: {
//             code: "INVALID_PARAMS",
//             message: "query parameter is required",
//           },
//         });
//         return;
//       }
//       const { network, chain } = req;
//       const results = await searchAgents({
//         query,
//         network,
//         limit,
//         semanticWeight: 0.7,
//       });
//       res.json({
//         data: results,
//         source: "8004scan",
//         meta: buildNetworkMeta(network, chain),
//         timestamp: new Date().toISOString(),
//       });
//     } catch (err) {
//       next(err);
//     }
//   }
// );
// // ─────────────────────────────────────────
// // GET /api/v1/discovery/stats
// // ─────────────────────────────────────────
// router.get(
//   "/stats",
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { network, chain } = req;
//       const [platformStats, indexedCount] = await Promise.all([
//         import("../../lib/scan8004").then((m) => m.getPlatformStats()),
//         import("../../indexer/vector").then((m) =>
//           m.countIndexed(network)
//         ),
//       ]);
//       res.json({
//         data: {
//           platform: platformStats,
//           cam: {
//             indexedAgents: indexedCount,
//             network,
//             chainId: chain.chainId,
//           },
//         },
//         meta: buildNetworkMeta(network, chain),
//         timestamp: new Date().toISOString(),
//       });
//     } catch (err) {
//       next(err);
//     }
//   }
// );
// function buildNetworkMeta(network: any, chain: any): NetworkMeta {
//   return {
//     network,
//     chainId: chain.chainId,
//     chainName: chain.name,
//     isTestnet: chain.isTestnet,
//     blockExplorer: chain.blockExplorer,
//   };
// }
// export default router;
const express_1 = require("express");
const zod_1 = require("zod");
const embeddings_1 = require("../../indexer/embeddings");
const vector_1 = require("../../indexer/vector");
const client_1 = require("../../db/client");
const scan8004_1 = require("../../lib/scan8004");
const router = (0, express_1.Router)();
const discoveryQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(500),
    limit: zod_1.z.coerce.number().min(1).max(50).default(10),
    minScore: zod_1.z.coerce.number().min(0).max(100).optional(),
    category: zod_1.z.string().optional(),
    externalWeight: zod_1.z.coerce.number().min(0).max(1).default(0.3),
});
function mergeAndRankResults(camResults, externalResults, externalWeight) {
    const camWeight = 1 - externalWeight;
    const camRankMap = new Map(camResults.map((r, i) => [
        r.agentId,
        {
            normalizedRank: 1 - i / Math.max(camResults.length, 1),
            similarity: 1 - r.distance / 2,
        },
    ]));
    const externalRankMap = new Map(externalResults.map((r) => [
        r.agentId,
        {
            normalizedRank: 1 - r.externalRank / Math.max(externalResults.length, 1),
        },
    ]));
    const allAgentIds = new Set([
        ...camResults.map((r) => r.agentId),
        ...externalResults.map((r) => r.agentId),
    ]);
    const blended = [];
    for (const agentId of allAgentIds) {
        const cam = camRankMap.get(agentId);
        const ext = externalRankMap.get(agentId);
        const camScore = cam
            ? (cam.normalizedRank * 0.7 + cam.similarity * 0.3) * camWeight
            : 0;
        const extScore = ext ? ext.normalizedRank * externalWeight : 0;
        const agreementBonus = cam && ext ? 0.1 : 0;
        blended.push({
            agentId,
            blendedScore: camScore + extScore + agreementBonus,
        });
    }
    return blended.sort((a, b) => b.blendedScore - a.blendedScore);
}
// ─────────────────────────────────────────
// GET /api/v1/discovery
// ─────────────────────────────────────────
router.get("/", async (req, res, next) => {
    try {
        const parsed = discoveryQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                error: {
                    code: "INVALID_PARAMS",
                    message: "Invalid query parameters",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { query, limit, minScore, category, externalWeight } = parsed.data;
        const { network, chain } = req;
        // ─────────────────────────────────
        // Run both searches in parallel
        // Both are already scoped to network
        // ─────────────────────────────────
        const [queryEmbedding, externalSearchResults] = await Promise.all([
            (0, embeddings_1.generateEmbedding)(query),
            (0, scan8004_1.searchAgents)({
                query,
                network, // ← scoped to network
                limit: limit * 2,
                semanticWeight: 0.7,
            }),
        ]);
        // pgvector search — already filtered by network
        const vectorResults = await (0, vector_1.querySkillVectors)(network, queryEmbedding, limit * 2, minScore);
        // ─────────────────────────────────
        // Only include external results
        // that exist in our DB on this
        // exact network — prevents bleed
        // ─────────────────────────────────
        const vectorAgentIds = new Set(vectorResults.map((r) => r.agentId));
        // Pre-check which external IDs exist
        // on this network in our DB
        const externalAgentIds = externalSearchResults.map((a) => a.token_id.toString());
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../../db/client")));
        const existingOnNetwork = await prisma.agent.findMany({
            where: {
                agentId: { in: externalAgentIds },
                network: network,
            },
            select: { agentId: true },
        });
        const existingOnNetworkSet = new Set(existingOnNetwork.map((a) => a.agentId));
        // Filter external results to only agents
        // confirmed on this network
        const externalForMerge = externalSearchResults
            .filter((a) => existingOnNetworkSet.has(a.token_id.toString()))
            .map((a, i) => ({
            agentId: a.token_id.toString(),
            externalRank: i,
        }));
        // Merge and rank
        const merged = mergeAndRankResults(vectorResults, externalForMerge, externalWeight);
        if (merged.length === 0) {
            res.json({
                data: [],
                meta: buildNetworkMeta(network, chain),
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const mergedAgentIds = merged.map((r) => r.agentId);
        const agents = await (0, client_1.getAgentsWithScores)(network, mergedAgentIds, minScore);
        // ─────────────────────────────────
        // Strict network guard — belt and
        // suspenders after all the above
        // ─────────────────────────────────
        const networkFiltered = agents.filter((a) => a.network === network || !a.network);
        // Filter by category
        const filtered = category
            ? networkFiltered.filter((a) => a.skills.some((s) => s.category === category))
            : networkFiltered;
        // Final sort — CAM Score primary, blended relevance tiebreaker
        const blendedScoreMap = new Map(merged.map((r) => [r.agentId, r.blendedScore]));
        const sorted = filtered
            .sort((a, b) => {
            const camScoreDiff = (b.score?.total ?? 0) - (a.score?.total ?? 0);
            if (Math.abs(camScoreDiff) > 5)
                return camScoreDiff;
            return ((blendedScoreMap.get(b.agentId) ?? 0) -
                (blendedScoreMap.get(a.agentId) ?? 0));
        })
            .slice(0, limit);
        // Shape response
        const results = sorted.map((a) => ({
            agentId: a.agentId,
            name: a.name,
            description: a.description,
            skills: a.skills.map((skill) => ({
                ...skill,
                source: skill.version === "selfclaw"
                    ? "selfclaw"
                    : skill.version === "inferred"
                        ? "protocol"
                        : "skill.md",
                confidence: skill.version === "selfclaw"
                    ? "medium"
                    : skill.version === "inferred"
                        ? "low"
                        : "high",
            })),
            camScore: a.score?.total ?? 0,
            breakdown: {
                identity: a.score?.breakdown?.identity ?? 0,
                execution: a.score?.breakdown?.execution ?? 0,
                skillIntegrity: a.score?.breakdown?.skillIntegrity ?? 0,
            },
            flags: a.flags,
            x402Endpoint: a.x402Endpoint,
            network, // ← always the requested network
            chain: {
                chainId: chain.chainId,
                name: chain.name,
                blockExplorer: chain.blockExplorer,
                isTestnet: chain.isTestnet,
                stablecoins: chain.stablecoins,
            },
            relevance: {
                blendedScore: blendedScoreMap.get(a.agentId) ?? 0,
                inVectorIndex: vectorResults.some((r) => r.agentId === a.agentId),
                inExternalSearch: externalForMerge.some((r) => r.agentId === a.agentId),
                agreementBonus: vectorResults.some((r) => r.agentId === a.agentId) &&
                    externalForMerge.some((r) => r.agentId === a.agentId),
            },
            lastActive: null,
            registrationTimestamp: a.registrationTimestamp,
            blockExplorerUrl: `${chain.blockExplorer}/token/${a.agentId}`,
        }));
        res.json({
            data: results,
            meta: buildNetworkMeta(network, chain),
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────
// GET /api/v1/discovery/external
// ─────────────────────────────────────────
router.get("/external", async (req, res, next) => {
    try {
        const query = req.query.query;
        const limit = Math.min(Number(req.query.limit ?? 10), 50);
        if (!query?.trim()) {
            res.status(400).json({
                error: {
                    code: "INVALID_PARAMS",
                    message: "query parameter is required",
                },
            });
            return;
        }
        const { network, chain } = req;
        const results = await (0, scan8004_1.searchAgents)({
            query,
            network,
            limit,
            semanticWeight: 0.7,
        });
        res.json({
            data: results,
            source: "8004scan",
            meta: buildNetworkMeta(network, chain),
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
});
// ─────────────────────────────────────────
// GET /api/v1/discovery/stats
// ─────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
    try {
        const { network, chain } = req;
        const [platformStats, indexedCount] = await Promise.all([
            Promise.resolve().then(() => __importStar(require("../../lib/scan8004"))).then((m) => m.getPlatformStats()),
            Promise.resolve().then(() => __importStar(require("../../indexer/vector"))).then((m) => m.countIndexed(network)),
        ]);
        res.json({
            data: {
                platform: platformStats,
                cam: {
                    indexedAgents: indexedCount,
                    network,
                    chainId: chain.chainId,
                },
            },
            meta: buildNetworkMeta(network, chain),
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
});
function buildNetworkMeta(network, chain) {
    return {
        network,
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet,
        blockExplorer: chain.blockExplorer,
    };
}
exports.default = router;
//# sourceMappingURL=discovery.js.map