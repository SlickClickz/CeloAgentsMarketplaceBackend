"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scoring_1 = require("../../scoring");
const rateLimit_1 = require("../middleware/rateLimit");
const client_1 = require("../../db/client");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────
// POST /api/v1/score/refresh/:agentId
// ─────────────────────────────────────────
router.post("/refresh/:agentId", rateLimit_1.scoreRefreshLimiter, async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const { network, chain } = req;
        const score = await (0, scoring_1.computeAndStoreScore)(agentId, network);
        const meta = {
            network,
            chainId: chain.chainId,
            chainName: chain.name,
            isTestnet: chain.isTestnet,
            blockExplorer: chain.blockExplorer,
        };
        const response = {
            data: score,
            meta,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (err) {
        if (err.message?.includes("not found")) {
            res.status(404).json({
                error: { code: "AGENT_NOT_FOUND", message: err.message },
            });
            return;
        }
        next(err);
    }
});
// ─────────────────────────────────────────
// GET /api/v1/score/leaderboard
// Returns top agents by CAM score directly
// from DB — no vector search needed so
// ALL scored agents appear regardless of
// whether they have embeddings
//
// Query params:
//   network  — mainnet | testnet
//   limit    — default 50, max 200
//   minScore — optional minimum score filter
// ─────────────────────────────────────────
router.get("/leaderboard", async (req, res, next) => {
    try {
        const { network, chain } = req;
        const limit = Math.min(Number(req.query.limit ?? 50), 200);
        const minScore = req.query.minScore
            ? Number(req.query.minScore)
            : undefined;
        const dbNetwork = network === "mainnet" ? "mainnet" : "testnet";
        const records = await client_1.prisma.agentScore.findMany({
            where: {
                network: dbNetwork,
                ...(minScore !== undefined ? { total: { gte: minScore } } : {}),
            },
            orderBy: { total: "desc" },
            take: limit,
            include: {
                agent: {
                    include: {
                        skills: true,
                        flags: true,
                    },
                },
            },
        });
        const meta = {
            network,
            chainId: chain.chainId,
            chainName: chain.name,
            isTestnet: chain.isTestnet,
            blockExplorer: chain.blockExplorer,
        };
        const data = records
            .filter((r) => r.agent !== null)
            .map((r) => ({
            agentId: r.agentId,
            name: r.agent.name,
            description: r.agent.description,
            walletAddress: r.agent.walletAddress,
            x402Endpoint: r.agent.x402Endpoint,
            registrationTimestamp: r.agent.registrationTimestamp,
            network,
            camScore: r.total,
            breakdown: {
                identity: r.identityScore,
                reputation: r.executionScore,
                skillIntegrity: r.integrityScore,
            },
            skills: r.agent.skills.map((s) => ({
                name: s.name,
                description: s.description,
                category: s.category.replace(/_/g, "-"),
                source: s.version === "selfclaw"
                    ? "selfclaw"
                    : s.version === "inferred"
                        ? "protocol"
                        : "skill.md",
                confidence: s.version === "selfclaw"
                    ? "medium"
                    : s.version === "inferred"
                        ? "low"
                        : "high",
            })),
            flags: r.agent.flags.map((f) => ({
                type: f.type,
                message: f.message,
                severity: f.severity,
            })),
            lastUpdated: r.lastUpdated,
            chain: {
                chainId: chain.chainId,
                name: chain.name,
                blockExplorer: chain.blockExplorer,
                isTestnet: chain.isTestnet,
            },
            blockExplorerUrl: `${chain.blockExplorer}/token/${r.agentId}`,
            // Compatibility with DiscoveryResult shape
            relevance: {
                blendedScore: r.total / 100,
                inVectorIndex: false,
                inExternalSearch: false,
                agreementBonus: false,
            },
        }));
        res.json({
            data,
            meta,
            total: data.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=score.js.map