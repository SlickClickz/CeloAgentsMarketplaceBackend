// import { Router, Request, Response, NextFunction } from "express";
// import { getAgentById, getAgentsWithScores, prisma } from "../../db/client";
// import { CAMApiResponse, NetworkMeta } from "../../types/agent";
// import {
//   getSelfClawAgentByWallet,
//   getSelfClawReputation,
//   getAgentSelfClawSkills,
//   getVerificationLevelScore,
// } from "../../lib/selfclaw";
// import { getAgent as get8004Agent } from "../../lib/scan8004";

// const router = Router();

// // ─────────────────────────────────────────
// // GET /api/v1/agent/:agentId
// // Full agent profile with enriched data:
// // - CAM Score + full breakdown
// // - SelfClaw verification status + badges
// // - Skills with confidence levels
// // - Protocol capabilities
// // - 8004scan platform data
// // ─────────────────────────────────────────
// router.get(
//   "/:agentId",
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { agentId } = req.params;
//       const { network, chain } = req;

//       const agent = await getAgentById(agentId, network);

//       if (!agent) {
//         res.status(404).json({
//           error: {
//             code: "AGENT_NOT_FOUND",
//             message: `Agent ${agentId} not found on ${network}`,
//             network,
//             chainId: chain.chainId,
//           },
//         });
//         return;
//       }

//       // ───────────────────────────────────
//       // Fetch enrichment data in parallel
//       // from 8004scan + SelfClaw
//       // ───────────────────────────────────
//       const [withScore] = await getAgentsWithScores(network, [agentId]);

//       const [scan8004Agent, selfClawAgent] = await Promise.all([
//         get8004Agent(agentId, network).catch(() => null),
//         getSelfClawAgentByWallet(agent.walletAddress).catch(() => null),
//       ]);

//       // Fetch SelfClaw reputation + skills
//       // only if we found the agent on SelfClaw
//       const [selfClawReputation, selfClawSkills] = await Promise.all([
//         selfClawAgent?.publicKey
//           ? getSelfClawReputation(selfClawAgent.publicKey).catch(
//               () => null
//             )
//           : Promise.resolve(null),
//         selfClawAgent?.publicKey
//           ? getAgentSelfClawSkills(selfClawAgent.publicKey).catch(
//               () => []
//             )
//           : Promise.resolve([]),
//       ]);

//       // ───────────────────────────────────
//       // Build enriched skills list with
//       // confidence levels per skill
//       // ───────────────────────────────────
//       const enrichedSkills = withScore?.skills?.map((skill: any) => ({
//         ...skill,
//         // skill.md skills have version field set
//         // SelfClaw skills have version = "selfclaw"
//         // Protocol inferred have version = "inferred"
//         source:
//           skill.version === "selfclaw"
//             ? "selfclaw"
//             : skill.version === "inferred"
//             ? "protocol"
//             : "skill.md",
//         confidence:
//           skill.version === "selfclaw"
//             ? "medium"
//             : skill.version === "inferred"
//             ? "low"
//             : "high",
//       })) ?? [];

//       // ───────────────────────────────────
//       // SelfClaw verification details
//       // ───────────────────────────────────
//       const selfClawProfile = selfClawAgent
//         ? {
//             verified: selfClawAgent.verified,
//             verificationLevel: selfClawAgent.verificationLevel ?? null,
//             verificationLevelScore: getVerificationLevelScore(
//               selfClawAgent.verificationLevel
//             ),
//             agentName: selfClawAgent.agentName,
//             humanId: selfClawAgent.humanId,
//             pipelineComplete: selfClawAgent.pipeline
//               ? selfClawAgent.pipeline.verified &&
//                 selfClawAgent.pipeline.walletCreated &&
//                 selfClawAgent.pipeline.erc8004Registered
//               : false,
//             reputation: selfClawReputation
//               ? {
//                   score: selfClawReputation.reputationScore,
//                   totalStakes: selfClawReputation.totalStakes,
//                   validated: selfClawReputation.validated,
//                   slashed: selfClawReputation.slashed,
//                   badges: selfClawReputation.badges,
//                 }
//               : null,
//             skills: selfClawSkills.map((s) => ({
//               name: s.name,
//               description: s.description,
//               category: s.category,
//               price: s.price,
//               priceToken: s.priceToken,
//               avgRating: s.avgRating,
//               totalPurchases: s.totalPurchases,
//             })),
//           }
//         : null;

//       // ───────────────────────────────────
//       // 8004scan platform data
//       // ───────────────────────────────────
//       const platformProfile = scan8004Agent
//         ? {
//             totalScore: scan8004Agent.total_score ?? 0,
//             starCount: scan8004Agent.star_count ?? 0,
//             totalFeedbacks: scan8004Agent.total_feedbacks ?? 0,
//             supportedProtocols: scan8004Agent.supported_protocols ?? [],
//             createdAt: scan8004Agent.created_at,
//           }
//         : null;

//       // ───────────────────────────────────
//       // Shape final response
//       // ───────────────────────────────────
//       const meta: NetworkMeta = {
//         network,
//         chainId: chain.chainId,
//         chainName: chain.name,
//         isTestnet: chain.isTestnet,
//         blockExplorer: chain.blockExplorer,
//       };

//       const response: CAMApiResponse<any> = {
//         data: {
//           // Core identity
//           agentId: withScore?.agentId ?? agentId,
//           name: withScore?.name ?? agent.name,
//           description: withScore?.description ?? agent.description,
//           walletAddress: agent.walletAddress,
//           tokenURI: agent.tokenURI,
//           x402Endpoint: withScore?.x402Endpoint ?? agent.x402Endpoint,
//           registrationTimestamp: withScore?.registrationTimestamp,
//           network,

//           // CAM Score — full breakdown
//           camScore: {
//             total: withScore?.score?.total ?? 0,
//             breakdown: {
//               identity: withScore?.score?.breakdown?.identity ?? 0,
//               reputation: withScore?.score?.breakdown?.execution ?? 0,
//               skillIntegrity:
//                 withScore?.score?.breakdown?.skillIntegrity ?? 0,
//             },
//             flags: withScore?.flags ?? [],
//             lastUpdated: withScore?.score?.lastUpdated ?? null,
//           },

//           // Skills with confidence levels
//           skills: enrichedSkills,
//           skillSources: {
//             skillMd: enrichedSkills.filter(
//               (s: any) => s.source === "skill.md"
//             ).length,
//             selfclaw: enrichedSkills.filter(
//               (s: any) => s.source === "selfclaw"
//             ).length,
//             protocol: enrichedSkills.filter(
//               (s: any) => s.source === "protocol"
//             ).length,
//           },

//           // SelfClaw profile
//           selfclaw: selfClawProfile,

//           // 8004scan platform data
//           platform: platformProfile,

//           // Chain info
//           chain: {
//             chainId: chain.chainId,
//             name: chain.name,
//             blockExplorer: chain.blockExplorer,
//             isTestnet: chain.isTestnet,
//             stablecoins: chain.stablecoins,
//           },
//           blockExplorerUrl: `${chain.blockExplorer}/token/${agentId}`,
//         },
//         meta,
//         timestamp: new Date().toISOString(),
//       };

//       res.json(response);
//     } catch (err) {
//       next(err);
//     }
//   }
// );

// // ─────────────────────────────────────────
// // GET /api/v1/agent/:agentId/score/history
// // Score trend over time
// // ─────────────────────────────────────────
// router.get(
//   "/:agentId/score/history",
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { agentId } = req.params;
//       const { network, chain } = req;
//       const limit = Math.min(Number(req.query.limit ?? 30), 100);

//       const history = await prisma.agentScoreHistory.findMany({
//         where: {
//           agentId,
//           network: network === "mainnet" ? "mainnet" : "testnet",
//         },
//         orderBy: { recordedAt: "desc" },
//         take: limit,
//       });

//       const meta: NetworkMeta = {
//         network,
//         chainId: chain.chainId,
//         chainName: chain.name,
//         isTestnet: chain.isTestnet,
//         blockExplorer: chain.blockExplorer,
//       };

//       res.json({
//         data: history.map((h: any) => ({
//           total: h.total,
//           breakdown: {
//             identity: h.identityScore,
//             reputation: h.executionScore,
//             skillIntegrity: h.integrityScore,
//           },
//           recordedAt: h.recordedAt,
//         })),
//         meta,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (err) {
//       next(err);
//     }
//   }
// );

// export default router;

import { Router, Request, Response, NextFunction } from "express";
import { getAgentById, getAgentsWithScores, prisma } from "../../db/client";
import { CAMApiResponse, NetworkMeta, AgentSkill } from "../../types/agent";
import {
  getSelfClawAgentByWallet,
  getSelfClawReputation,
  getAgentSelfClawSkills,
  getVerificationLevelScore,
} from "../../lib/selfclaw";
import { getAgent as get8004Agent } from "../../lib/scan8004";

const router = Router();

// ─────────────────────────────────────────
// GET /api/v1/agent/:agentId
// ─────────────────────────────────────────
router.get(
  "/:agentId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const { network, chain } = req;

      // ───────────────────────────────────
      // Load agent + score + flags + skills
      // all in one DB call
      // ───────────────────────────────────
      const agentRecord = await prisma.agent.findUnique({
        where: {
          agentId_network: {
            agentId,
            network: network as any,
          },
        },
        include: {
          skills: true,
          score: true,
          flags: true,
        },
      });

      if (!agentRecord) {
        res.status(404).json({
          error: {
            code: "AGENT_NOT_FOUND",
            message: `Agent ${agentId} not found on ${network}`,
            network,
            chainId: chain.chainId,
          },
        });
        return;
      }

      // ───────────────────────────────────
      // Fetch enrichment in parallel
      // ───────────────────────────────────
      const [scan8004Agent, selfClawAgent] = await Promise.all([
        get8004Agent(agentId, network).catch(() => null),
        getSelfClawAgentByWallet(
          agentRecord.walletAddress as `0x${string}`
        ).catch(() => null),
      ]);

      const [selfClawReputation, selfClawSkills] = await Promise.all([
        selfClawAgent?.publicKey
          ? getSelfClawReputation(selfClawAgent.publicKey).catch(() => null)
          : Promise.resolve(null),
        selfClawAgent?.publicKey
          ? getAgentSelfClawSkills(selfClawAgent.publicKey).catch(() => [])
          : Promise.resolve([]),
      ]);

      // ───────────────────────────────────
      // Skills — read directly from DB
      // with confidence tagging
      // Falls back to 8004scan protocols
      // if DB has no skills
      // ───────────────────────────────────
      let enrichedSkills = agentRecord.skills.map((s: any) => ({
        name: s.name,
        description: s.description,
        category: s.category.replace(/_/g, "-"),
        source:
          s.version === "selfclaw"
            ? "selfclaw"
            : s.version === "inferred" || s.version === "oasf"
            ? "protocol"
            : "skill.md",
        confidence:
          s.version === "selfclaw"
            ? "medium"
            : s.version === "inferred" || s.version === "oasf"
            ? "low"
            : "high",
        version: s.version,
      }));

      // If DB has no skills, try to show
      // at least protocols from 8004scan
      if (enrichedSkills.length === 0 && scan8004Agent?.supported_protocols?.length) {
        enrichedSkills = scan8004Agent.supported_protocols.map((p: string) => ({
          name: p,
          description: `Supports ${p} protocol`,
          category: "other",
          source: "protocol",
          confidence: "low",
          version: "inferred",
        }));
      }

      // ───────────────────────────────────
      // x402 endpoint — DB first, then
      // try 8004scan web service
      // ───────────────────────────────────
      // const x402Endpoint =
      //   agentRecord.x402Endpoint ??
      //   (scan8004Agent as any)?.services?.find(
      //     (s: any) => s.name?.toLowerCase() === "web"
      //   )?.endpoint ??
      //   null;
      const x402Endpoint = agentRecord.x402Endpoint ?? null;

      // ───────────────────────────────────
      // SelfClaw profile
      // ───────────────────────────────────
      const selfClawProfile = selfClawAgent
        ? {
            verified: selfClawAgent.verified,
            verificationLevel: selfClawAgent.verificationLevel ?? null,
            verificationLevelScore: getVerificationLevelScore(
              selfClawAgent.verificationLevel
            ),
            agentName: selfClawAgent.agentName,
            humanId: selfClawAgent.humanId,
            pipelineComplete: selfClawAgent.pipeline
              ? selfClawAgent.pipeline.verified &&
                selfClawAgent.pipeline.walletCreated &&
                selfClawAgent.pipeline.erc8004Registered
              : false,
            reputation: selfClawReputation
              ? {
                  score: selfClawReputation.reputationScore,
                  totalStakes: selfClawReputation.totalStakes,
                  validated: selfClawReputation.validated,
                  slashed: selfClawReputation.slashed,
                  badges: selfClawReputation.badges,
                }
              : null,
            skills: selfClawSkills.map((s) => ({
              name: s.name,
              description: s.description,
              category: s.category,
              price: s.price,
              priceToken: s.priceToken,
              avgRating: s.avgRating,
              totalPurchases: s.totalPurchases,
            })),
          }
        : null;

      // ───────────────────────────────────
      // 8004scan platform data
      // ───────────────────────────────────
      const platformProfile = scan8004Agent
        ? {
            totalScore: scan8004Agent.total_score ?? 0,
            starCount: scan8004Agent.star_count ?? 0,
            totalFeedbacks: scan8004Agent.total_feedbacks ?? 0,
            supportedProtocols: scan8004Agent.supported_protocols ?? [],
            createdAt: scan8004Agent.created_at,
          }
        : null;

      // ───────────────────────────────────
      // Shape response
      // ───────────────────────────────────
      const meta: NetworkMeta = {
        network,
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet,
        blockExplorer: chain.blockExplorer,
      };

      res.json({
        data: {
          agentId,
          name: agentRecord.name,
          description: agentRecord.description,
          walletAddress: agentRecord.walletAddress,
          tokenURI: agentRecord.tokenURI,
          x402Endpoint,
          registrationTimestamp: agentRecord.registrationTimestamp,
          network,

          camScore: {
            total: agentRecord.score?.total ?? 0,
            breakdown: {
              identity: agentRecord.score?.identityScore ?? 0,
              reputation: agentRecord.score?.executionScore ?? 0,
              skillIntegrity: agentRecord.score?.integrityScore ?? 0,
            },
            flags: agentRecord.flags.map((f: any) => ({
              type: f.type,
              message: f.message,
              severity: f.severity,
            })),
            lastUpdated: agentRecord.score?.lastUpdated ?? null,
          },

          skills: enrichedSkills,
          skillSources: {
            skillMd: enrichedSkills.filter(
              (s: any) => s.source === "skill.md"
            ).length,
            selfclaw: enrichedSkills.filter(
              (s: any) => s.source === "selfclaw"
            ).length,
            protocol: enrichedSkills.filter(
              (s: any) => s.source === "protocol"
            ).length,
          },

          selfclaw: selfClawProfile,
          platform: platformProfile,

          chain: {
            chainId: chain.chainId,
            name: chain.name,
            blockExplorer: chain.blockExplorer,
            isTestnet: chain.isTestnet,
            stablecoins: chain.stablecoins,
          },
          blockExplorerUrl: `${chain.blockExplorer}/token/${agentId}`,
        },
        meta,
        timestamp: new Date().toISOString(),
      } as CAMApiResponse<any>);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────
// GET /api/v1/agent/:agentId/score/history
// ─────────────────────────────────────────
router.get(
  "/:agentId/score/history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const { network, chain } = req;
      const limit = Math.min(Number(req.query.limit ?? 30), 100);

      const history = await prisma.agentScoreHistory.findMany({
        where: {
          agentId,
          network: network as any,
        },
        orderBy: { recordedAt: "desc" },
        take: limit,
      });

      const meta: NetworkMeta = {
        network,
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet,
        blockExplorer: chain.blockExplorer,
      };

      res.json({
        data: history.map((h: any) => ({
          total: h.total,
          breakdown: {
            identity: h.identityScore,
            reputation: h.executionScore,
            skillIntegrity: h.integrityScore,
          },
          recordedAt: h.recordedAt,
        })),
        meta,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;