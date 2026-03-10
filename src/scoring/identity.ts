// import { env, CeloNetwork } from "../config/env";
// import { AgentFlag } from "../types/agent";
// import { getAgent } from "../lib/scan8004";
// import { Scan8004Agent } from "../types/erc8004";

// // ─────────────────────────────────────────
// // Scoring weights
// // ─────────────────────────────────────────
// const WEIGHTS = {
//   isRegistered: 10,     // base for valid ERC-8004 registration
//   ageBonus: 10,         // max points for registration age
//   selfClawVerified: 5,  // SelfClaw verification
//   platformScore: 5,     // 8004scan total_score bonus (0-5pts)
// };

// // ─────────────────────────────────────────
// // Age bonus — 0 to 10pts based on how long
// // the agent has been registered
// // ─────────────────────────────────────────
// function computeAgeBonus(createdAt: string): number {
//   const ageDays =
//     (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

//   if (ageDays >= 30) return 10;
//   if (ageDays >= 14) return 7;
//   if (ageDays >= 7) return 4;
//   if (ageDays >= 1) return 2;
//   return 0;
// }

// // ─────────────────────────────────────────
// // Platform score bonus — reward agents that
// // the 8004scan community has already rated
// // 8004scan total_score is 0-100, we map
// // it to a 0-5 bonus
// // ─────────────────────────────────────────
// function computePlatformScoreBonus(totalScore: number): number {
//   if (totalScore >= 80) return 5;
//   if (totalScore >= 60) return 4;
//   if (totalScore >= 40) return 3;
//   if (totalScore >= 20) return 2;
//   if (totalScore > 0) return 1;
//   return 0;
// }

// // ─────────────────────────────────────────
// // Detect SelfClaw verification from
// // supported_protocols array on the agent
// // 8004scan doesn't have a dedicated field
// // but agents can list "SelfClaw" as a
// // supported protocol
// // ─────────────────────────────────────────
// function isSelfClawVerified(agent: Scan8004Agent): boolean {
//   return agent.supported_protocols.some(
//     (p) => p.toLowerCase().includes("selfclaw") ||
//            p.toLowerCase().includes("self")
//   );
// }

// // ─────────────────────────────────────────
// // Main export
// // ─────────────────────────────────────────
// export async function computeIdentityScore(
//   agentId: string,
//   network: CeloNetwork
// ): Promise<{
//   score: number;
//   flags: AgentFlag[];
//   meta: {
//     selfClawVerified: boolean;
//     registeredAt: string | null;
//     ageDays: number;
//     platformScore: number;
//     starCount: number;
//     supportedProtocols: string[];
//   };
// }> {
//   const flags: AgentFlag[] = [];
//   let score = 0;

//   // agentId is the token_id on 8004scan
//   const agent = await getAgent(agentId, network);

//   if (!agent) {
//     flags.push({
//       type: "UNVERIFIED",
//       message: "Agent not found in 8004scan registry",
//       severity: "critical",
//     });
//     return {
//       score: 0,
//       flags,
//       meta: {
//         selfClawVerified: false,
//         registeredAt: null,
//         ageDays: 0,
//         platformScore: 0,
//         starCount: 0,
//         supportedProtocols: [],
//       },
//     };
//   }

//   // Base registration points
//   score += WEIGHTS.isRegistered;

//   // Age bonus
//   const ageBonus = computeAgeBonus(agent.created_at);
//   score += ageBonus;

//   const ageDays = Math.floor(
//     (Date.now() - new Date(agent.created_at).getTime()) /
//       (1000 * 60 * 60 * 24)
//   );

//   if (ageDays < 1) {
//     flags.push({
//       type: "NEW_AGENT",
//       message: "Agent registered less than 24 hours ago",
//       severity: "info",
//     });
//   }

//   // SelfClaw verification
//   const selfClawVerified = isSelfClawVerified(agent);
//   if (selfClawVerified) {
//     score += WEIGHTS.selfClawVerified;
//   } else {
//     flags.push({
//       type: "UNVERIFIED",
//       message: "Agent has not completed SelfClaw verification",
//       severity: "warning",
//     });
//   }

//   // Platform score bonus from 8004scan community
//   const platformBonus = computePlatformScoreBonus(agent.total_score ?? 0);
//   score += platformBonus;

//   return {
//     score: Math.min(score, 30), // hard cap at 30
//     flags,
//     meta: {
//       selfClawVerified,
//       registeredAt: agent.created_at,
//       ageDays,
//       platformScore: agent.total_score ?? 0,
//       starCount: agent.star_count ?? 0,
//       supportedProtocols: agent.supported_protocols,
//     },
//   }
// }

import { CeloNetwork } from "../config/env";
import { AgentFlag } from "../types/agent";
import { getAgent } from "../lib/scan8004";
import { Scan8004Agent } from "../types/erc8004";
import {
  getSelfClawAgentByWallet,
  getSelfClawReputation,
  getVerificationLevelScore,
} from "../lib/selfclaw";

// ─────────────────────────────────────────
// Scoring weights — total 40pts
// ─────────────────────────────────────────
const WEIGHTS = {
  isRegistered: 10,       // base ERC-8004 registration
  ageBonus: 8,            // registration age
  selfClawVerified: 12,   // SelfClaw verification (scaled by level)
  platformScore: 5,       // 8004scan community score
  erc8004Pipeline: 5,     // completed full pipeline on SelfClaw
};

function computeAgeBonus(createdAt: string): number {
  const ageDays =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays >= 30) return 8;
  if (ageDays >= 14) return 6;
  if (ageDays >= 7) return 4;
  if (ageDays >= 1) return 2;
  return 0;
}

function computePlatformScoreBonus(totalScore: number): number {
  if (totalScore >= 80) return 5;
  if (totalScore >= 60) return 4;
  if (totalScore >= 40) return 3;
  if (totalScore >= 20) return 2;
  if (totalScore > 0) return 1;
  return 0;
}

export async function computeIdentityScore(
  agentId: string,
  network: CeloNetwork
): Promise<{
  score: number;
  flags: AgentFlag[];
  meta: {
    selfClawVerified: boolean;
    selfClawVerificationLevel: string | null;
    registeredAt: string | null;
    ageDays: number;
    platformScore: number;
    starCount: number;
    supportedProtocols: string[];
    selfClawPipelineComplete: boolean;
  };
}> {
  const flags: AgentFlag[] = [];
  let score = 0;

  const agent = await getAgent(agentId, network);

  if (!agent) {
    flags.push({
      type: "UNVERIFIED",
      message: "Agent not found in 8004scan registry",
      severity: "critical",
    });
    return {
      score: 0,
      flags,
      meta: {
        selfClawVerified: false,
        selfClawVerificationLevel: null,
        registeredAt: null,
        ageDays: 0,
        platformScore: 0,
        starCount: 0,
        supportedProtocols: [],
        selfClawPipelineComplete: false,
      },
    };
  }

  // Base registration
  score += WEIGHTS.isRegistered;

  // Age bonus
  const ageBonus = computeAgeBonus(agent.created_at);
  score += ageBonus;

  const ageDays = Math.floor(
    (Date.now() - new Date(agent.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (ageDays < 1) {
    flags.push({
      type: "NEW_AGENT",
      message: "Agent registered less than 24 hours ago",
      severity: "info",
    });
  }

  // ─────────────────────────────────────
  // SelfClaw cross-reference
  // Look up by owner wallet address —
  // this is our bridge between 8004scan
  // and SelfClaw identities
  // ─────────────────────────────────────
  const [selfClawAgent, selfClawReputation] = await Promise.all([
    getSelfClawAgentByWallet(agent.owner_address),
    getSelfClawAgentByWallet(agent.owner_address).then((a) =>
      a?.publicKey
        ? getSelfClawReputation(a.publicKey)
        : Promise.resolve(null)
    ),
  ]);

  let selfClawVerified = false;
  let selfClawVerificationLevel: string | null = null;
  let selfClawPipelineComplete = false;

  if (selfClawAgent?.verified) {
    selfClawVerified = true;
    selfClawVerificationLevel =
      selfClawAgent.verificationLevel ?? "verified";

    // Scale SelfClaw score by verification level strength
    const levelScore = getVerificationLevelScore(
      selfClawAgent.verificationLevel
    );
    score += Math.round(WEIGHTS.selfClawVerified * levelScore);

    // Bonus for completing the full SelfClaw pipeline
    // (verified + wallet + token + ERC-8004 + sponsorship)
    if (selfClawAgent.pipeline) {
      const pipeline = selfClawAgent.pipeline;
      selfClawPipelineComplete =
        pipeline.verified &&
        pipeline.walletCreated &&
        pipeline.erc8004Registered;

      if (selfClawPipelineComplete) {
        score += WEIGHTS.erc8004Pipeline;
      }
    }
  } else {
    flags.push({
      type: "UNVERIFIED",
      message: "Agent has not completed SelfClaw verification",
      severity: "warning",
    });
  }

  // Platform score bonus from 8004scan
  const platformBonus = computePlatformScoreBonus(agent.total_score ?? 0);
  score += platformBonus;

  return {
    score: Math.min(score, 40), // hard cap at 40
    flags,
    meta: {
      selfClawVerified,
      selfClawVerificationLevel,
      registeredAt: agent.created_at,
      ageDays,
      platformScore: agent.total_score ?? 0,
      starCount: agent.star_count ?? 0,
      supportedProtocols: agent.supported_protocols ?? [],
      selfClawPipelineComplete,
    },
  };
}