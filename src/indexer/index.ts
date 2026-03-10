// import { AgentMetadata, AgentSkill } from "../types/agent";
// import {
//   parseSkillMd,
//   inferSkillsFromProtocols,
//   parseSelfClawSkills,
//   mergeSkillSources,
//   skillsToEmbeddingText,
// } from "./skillParser";
// import { generateEmbedding } from "./embeddings";
// import { upsertSkillVector, updateVectorScore } from "./vector";
// import { getAgent } from "../lib/scan8004";
// import {
//   getSelfClawAgentByWallet,
//   getAgentSelfClawSkills,
// } from "../lib/selfclaw";
// import { CeloNetwork } from "../config/env";

// export async function indexAgentSkills(
//   agent: AgentMetadata
// ): Promise<void> {
//   // ─────────────────────────────────────
//   // Source 1: skill.md
//   // Already parsed and stored in agent.skills
//   // ─────────────────────────────────────
//   const skillMdSkills = agent.skills ?? [];

//   // ─────────────────────────────────────
//   // Source 2: SelfClaw skill marketplace
//   // Look up agent by wallet address to get
//   // publicKey, then fetch skills by publicKey
//   // ─────────────────────────────────────
//   let selfClawParsedSkills: AgentSkill[] = [];

//   try {
//     const selfClawAgent = await getSelfClawAgentByWallet(
//       agent.walletAddress
//     );

//     if (selfClawAgent?.publicKey) {
//       const selfClawSkills = await getAgentSelfClawSkills(
//         selfClawAgent.publicKey  // ← publicKey not agentName
//       );
//       selfClawParsedSkills = parseSelfClawSkills(selfClawSkills);

//       if (selfClawParsedSkills.length > 0) {
//         console.log(
//           `[Indexer] Found ${selfClawParsedSkills.length} SelfClaw skill(s) for agent ${agent.agentId}`
//         );
//       }
//     }
//   } catch {
//     // SelfClaw lookup failed — continue with other sources
//   }

//   // ─────────────────────────────────────
//   // Source 3: Protocol-inferred skills
//   // from 8004scan supported_protocols
//   // ─────────────────────────────────────
//   let protocolSkills: AgentSkill[] = [];

//   try {
//     const scan8004Agent = await getAgent(agent.agentId, agent.network);
//     if (scan8004Agent?.supported_protocols?.length) {
//       protocolSkills = inferSkillsFromProtocols(
//         scan8004Agent.supported_protocols
//       );

//       if (protocolSkills.length > 0) {
//         console.log(
//           `[Indexer] Inferred ${protocolSkills.length} skill(s) from protocols for agent ${agent.agentId}: ` +
//           `${scan8004Agent.supported_protocols.join(", ")}`
//         );
//       }
//     }
//   } catch {
//     // Protocol lookup failed — continue
//   }

//   // ─────────────────────────────────────
//   // Merge all sources
//   // Priority: skill.md > SelfClaw > protocol
//   // ─────────────────────────────────────
//   const mergedSkills = mergeSkillSources(
//     skillMdSkills,
//     selfClawParsedSkills,
//     protocolSkills
//   );

//   if (mergedSkills.length === 0) {
//     console.warn(
//       `[Indexer] Agent ${agent.agentId} has no skills from any source, skipping indexing`
//     );
//     return;
//   }

//   console.log(
//     `[Indexer] Agent ${agent.agentId} — ` +
//     `${skillMdSkills.length} from skill.md, ` +
//     `${selfClawParsedSkills.length} from SelfClaw, ` +
//     `${protocolSkills.length} inferred from protocols`
//   );

//   // ─────────────────────────────────────
//   // Generate embedding from merged skills
//   // and store in pgvector
//   // ─────────────────────────────────────
//   const embeddingText = skillsToEmbeddingText(mergedSkills);
//   const embedding = await generateEmbedding(embeddingText);

//   await upsertSkillVector(agent.agentId, agent.network, embedding, {
//     name: agent.name,
//     skills: mergedSkills.map((s) => s.name),
//     categories: [...new Set(mergedSkills.map((s) => s.category))],
//     x402Endpoint: agent.x402Endpoint,
//     camScore: 0,
//   });

//   console.log(
//     `[Indexer] ✅ Indexed ${mergedSkills.length} total skill(s) for agent ${agent.agentId} on ${agent.network}`
//   );
// }

// export async function reindexAgent(
//   agent: AgentMetadata
// ): Promise<void> {
//   console.log(`[Indexer] Re-indexing agent ${agent.agentId}`);
//   await indexAgentSkills(agent);
// }

// export async function syncScoreToIndex(
//   agentId: string,
//   network: CeloNetwork,
//   camScore: number
// ): Promise<void> {
//   await updateVectorScore(agentId, network, camScore);
// }

import { AgentMetadata, AgentSkill } from "../types/agent";
import {
  parseSkillMd,
  inferSkillsFromProtocols,
  parseSelfClawSkills,
  mergeSkillSources,
  skillsToEmbeddingText,
} from "./skillParser";
import { generateEmbedding } from "./embeddings";
import { upsertSkillVector, updateVectorScore } from "./vector";
import { getAgent } from "../lib/scan8004";
import {
  getSelfClawAgentByWallet,
  getAgentSelfClawSkills,
} from "../lib/selfclaw";
import { CeloNetwork } from "../config/env";

export async function indexAgentSkills(
  agent: AgentMetadata
): Promise<void> {
  // ─────────────────────────────────────
  // Source 1: skill.md
  // Already parsed and stored in agent.skills
  // ─────────────────────────────────────
  const skillMdSkills = agent.skills ?? [];

  // ─────────────────────────────────────
  // Source 2: SelfClaw skill marketplace
  // Look up agent by wallet address to get
  // publicKey, then fetch skills by publicKey
  // ─────────────────────────────────────
  let selfClawParsedSkills: AgentSkill[] = [];

  try {
    const selfClawAgent = await getSelfClawAgentByWallet(
      agent.walletAddress
    );

    if (selfClawAgent?.publicKey) {
      const selfClawSkills = await getAgentSelfClawSkills(
        selfClawAgent.publicKey
      );
      selfClawParsedSkills = parseSelfClawSkills(selfClawSkills);

      if (selfClawParsedSkills.length > 0) {
        console.log(
          `[Indexer] Found ${selfClawParsedSkills.length} SelfClaw skill(s) for agent ${agent.agentId}`
        );
      }
    }
  } catch {
    // SelfClaw lookup failed — continue with other sources
  }

  // ─────────────────────────────────────
  // Source 3: Protocol-inferred skills
  // from 8004scan supported_protocols
  // ─────────────────────────────────────
  let protocolSkills: AgentSkill[] = [];

  try {
    const scan8004Agent = await getAgent(agent.agentId, agent.network);
    if (scan8004Agent?.supported_protocols?.length) {
      protocolSkills = inferSkillsFromProtocols(
        scan8004Agent.supported_protocols
      );

      if (protocolSkills.length > 0) {
        console.log(
          `[Indexer] Inferred ${protocolSkills.length} skill(s) from protocols for agent ${agent.agentId}: ` +
          `${scan8004Agent.supported_protocols.join(", ")}`
        );
      }
    }
  } catch {
    // Protocol lookup failed — continue
  }

  // ─────────────────────────────────────
  // Merge all sources
  // Priority: skill.md > SelfClaw > protocol
  // ─────────────────────────────────────
  const mergedSkills = mergeSkillSources(
    skillMdSkills,
    selfClawParsedSkills,
    protocolSkills
  );

  // ─────────────────────────────────────
  // Build embedding text
  // If no skills from any source, fall back
  // to agent identity so the agent still
  // appears in discovery search results
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
    : skillsToEmbeddingText(mergedSkills);

  if (!embeddingText.trim()) {
    console.warn(
      `[Indexer] Agent ${agent.agentId} has no indexable content, skipping`
    );
    return;
  }

  if (hasFallback) {
    console.log(
      `[Indexer] Agent ${agent.agentId} has no skills from any source — indexing from identity only`
    );
  } else {
    console.log(
      `[Indexer] Agent ${agent.agentId} — ` +
      `${skillMdSkills.length} from skill.md, ` +
      `${selfClawParsedSkills.length} from SelfClaw, ` +
      `${protocolSkills.length} inferred from protocols`
    );
  }

  // ─────────────────────────────────────
  // Generate embedding and store in pgvector
  // ─────────────────────────────────────
  const embedding = await generateEmbedding(embeddingText);

  await upsertSkillVector(agent.agentId, agent.network, embedding, {
    name: agent.name,
    skills: mergedSkills.map((s) => s.name),
    categories: [...new Set(mergedSkills.map((s) => s.category))],
    x402Endpoint: agent.x402Endpoint,
    camScore: 0,
  });

  console.log(
    `[Indexer] ✅ Indexed agent ${agent.agentId} on ${agent.network} — ` +
    `${mergedSkills.length} skill(s), source: ${
      hasFallback ? "identity fallback" : "skills"
    }`
  );
}

export async function reindexAgent(
  agent: AgentMetadata
): Promise<void> {
  console.log(`[Indexer] Re-indexing agent ${agent.agentId}`);
  await indexAgentSkills(agent);
}

export async function syncScoreToIndex(
  agentId: string,
  network: CeloNetwork,
  camScore: number
): Promise<void> {
  await updateVectorScore(agentId, network, camScore);
}