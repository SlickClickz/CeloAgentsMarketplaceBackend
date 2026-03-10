// import { CeloNetwork } from "../config/env";
// import { CAMScore, AgentFlag } from "../types/agent";
// import { computeIdentityScore } from "./identity";
// import { computeExecutionScore, fetchExecutionData } from "./execution";
// import { computeIntegrityScore } from "./integrity";
// import { getAgentById, upsertScore } from "../db/client";
// import { syncScoreToIndex } from "../indexer";

// // ─────────────────────────────────────────
// // Compute full CAM Score for an agent
// // and persist to PostgreSQL + ChromaDB
// // ─────────────────────────────────────────
// export async function computeAndStoreScore(
//   agentId: string,
//   network: CeloNetwork
// ): Promise<CAMScore> {
//   // Fetch agent from DB to get declared skills
//   const agent = await getAgentById(agentId, network);

//   if (!agent) {
//     throw new Error(
//       `[Scoring] Agent ${agentId} not found on ${network}`
//     );
//   }

//   // Run all three scorers in parallel for speed
//   const [identityResult, executionResult, activityData] = await Promise.all([
//     computeIdentityScore(agentId, network),
//     computeExecutionScore(agentId, network),
//     fetchExecutionData(agentId, network),
//   ]);

//   // Integrity score uses execution data already fetched above
//   const integrityResult = computeIntegrityScore(
//     agent.skills,
//     activityData
//   );

//   // Merge all flags, deduplicate by type
//   const allFlags: AgentFlag[] = deduplicateFlags([
//     ...identityResult.flags,
//     ...executionResult.flags,
//     ...integrityResult.flags,
//   ]);

//   // Compute total
//   const total =
//     identityResult.score +
//     executionResult.score +
//     integrityResult.score;

//   const camScore: CAMScore = {
//     agentId,
//     network,
//     total: Math.min(total, 100), // hard cap at 100
//     breakdown: {
//       identity: identityResult.score,
//       execution: executionResult.score,
//       skillIntegrity: integrityResult.score,
//     },
//     flags: allFlags,
//     lastUpdated: new Date(),
//   };

//   // Persist to PostgreSQL
//   await upsertScore(camScore);

//   // Sync score to ChromaDB vector metadata
//   await syncScoreToIndex(agentId, network, camScore.total);

//   console.log(
//     `[Scoring] Agent ${agentId} on ${network}: ` +
//     `total=${camScore.total} ` +
//     `(identity=${identityResult.score}, ` +
//     `execution=${executionResult.score}, ` +
//     `integrity=${integrityResult.score})`
//   );

//   return camScore;
// }

// // ─────────────────────────────────────────
// // Deduplicate flags — if the same flag type
// // appears from multiple scorers, keep the
// // one with the highest severity
// // ─────────────────────────────────────────
// function deduplicateFlags(flags: AgentFlag[]): AgentFlag[] {
//   const severityRank = { critical: 3, warning: 2, info: 1 };
//   const seen = new Map<string, AgentFlag>();

//   for (const flag of flags) {
//     const existing = seen.get(flag.type);
//     if (
//       !existing ||
//       severityRank[flag.severity] > severityRank[existing.severity]
//     ) {
//       seen.set(flag.type, flag);
//     }
//   }

//   return [...seen.values()];
// }

import { CeloNetwork } from "../config/env";
import { CAMScore, AgentFlag } from "../types/agent";
import { computeIdentityScore } from "./identity";
import { computeReputationScore } from "./reputation";
import { getAgentById, upsertScore } from "../db/client";
import { syncScoreToIndex } from "../indexer";

// ─────────────────────────────────────────
// CAM Score = Identity (0-40) + Reputation (0-60)
// Total: 0-100
// ─────────────────────────────────────────
export async function computeAndStoreScore(
  agentId: string,
  network: CeloNetwork
): Promise<CAMScore> {
  const agent = await getAgentById(agentId, network);

  if (!agent) {
    throw new Error(`[Scoring] Agent ${agentId} not found on ${network}`);
  }

  // Run both scorers in parallel
  const [identityResult, reputationResult] = await Promise.all([
    computeIdentityScore(agentId, network),
    computeReputationScore(agentId, network),
  ]);

  // Merge and deduplicate flags
  const allFlags = deduplicateFlags([
    ...identityResult.flags,
    ...reputationResult.flags,
  ]);

  const total = identityResult.score + reputationResult.score;

  const camScore: CAMScore = {
    agentId,
    network,
    total: Math.min(total, 100),
    breakdown: {
      identity: identityResult.score,
      execution: reputationResult.score,  // reuse execution field in DB
      skillIntegrity: 0,                  // set to 0 — no longer used
    },
    flags: allFlags,
    lastUpdated: new Date(),
  };

  await upsertScore(camScore);
  await syncScoreToIndex(agentId, network, camScore.total);

  console.log(
    `[Scoring] Agent ${agentId} on ${network}: ` +
    `total=${camScore.total} ` +
    `(identity=${identityResult.score}, reputation=${reputationResult.score})`
  );

  return camScore;
}

function deduplicateFlags(flags: AgentFlag[]): AgentFlag[] {
  const severityRank = { critical: 3, warning: 2, info: 1 };
  const seen = new Map<string, AgentFlag>();

  for (const flag of flags) {
    const existing = seen.get(flag.type);
    if (
      !existing ||
      severityRank[flag.severity] > severityRank[existing.severity]
    ) {
      seen.set(flag.type, flag);
    }
  }

  return [...seen.values()];
}