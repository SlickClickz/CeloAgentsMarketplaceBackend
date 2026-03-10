import { Router, Request, Response, NextFunction } from "express";
import { computeAndStoreScore } from "../../scoring";
import { scoreRefreshLimiter } from "../middleware/rateLimit";
import { CAMApiResponse, NetworkMeta } from "../../types/agent";
import { prisma } from "../../db/client";

const router = Router();

// ─────────────────────────────────────────
// POST /api/v1/score/refresh/:agentId
// ─────────────────────────────────────────
router.post(
  "/refresh/:agentId",
  scoreRefreshLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const { network, chain } = req;
      const score = await computeAndStoreScore(agentId, network);

      const meta: NetworkMeta = {
        network,
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet,
        blockExplorer: chain.blockExplorer,
      };

      const response: CAMApiResponse<typeof score> = {
        data: score,
        meta,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        res.status(404).json({
          error: { code: "AGENT_NOT_FOUND", message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

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
router.get(
  "/leaderboard",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { network, chain } = req;
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const minScore = req.query.minScore
        ? Number(req.query.minScore)
        : undefined;

      const dbNetwork = network === "mainnet" ? "mainnet" : "testnet";

      const records = await prisma.agentScore.findMany({
        where: {
          network: dbNetwork as any,
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

      const meta: NetworkMeta = {
        network,
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet,
        blockExplorer: chain.blockExplorer,
      };

      const data = records
        .filter((r: any) => r.agent !== null)
        .map((r: any) => ({
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
          skills: r.agent.skills.map((s: any) => ({
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
          flags: r.agent.flags.map((f: any) => ({
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
    } catch (err) {
      next(err);
    }
  }
);

export default router;