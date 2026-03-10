import { AgentMetadata, AgentSkill } from "../types/agent";
import {
  parseSkillMd,
  inferSkillsFromProtocols,
  parseSelfClawSkills,
  mergeSkillSources,
  skillsToEmbeddingText,
} from "../indexer/skillParser";
import { generateEmbedding } from "../indexer/embeddings";
import { upsertSkillVector, updateVectorScore } from "../indexer/vector";
import { getAgent } from "../lib/scan8004";
import {
  getSelfClawAgentByWallet,
  getAgentSelfClawSkills,
} from "../lib/selfclaw";
import {
  extractX402Endpoint,
  extractOASFSkills,
  extractProtocols,
} from "./metadata";
import { CeloNetwork } from "../config/env";
import { startRegistryWatchers } from "./registry";

export async function indexAgentSkills(
  agent: AgentMetadata
): Promise<void> {
  // ─────────────────────────────────────
  // Source 1: skill.md
  // Already parsed and stored in agent.skills
  // ─────────────────────────────────────
  const skillMdSkills = agent.skills ?? [];

  // ─────────────────────────────────────
  // Source 2: OASF skills from metadata
  // Extracted from services[].skills array
  // in the agent's on-chain metadata JSON
  // ─────────────────────────────────────
  let oasfSkills: AgentSkill[] = [];

  if (agent.rawMetadata) {
    try {
      const oasfNames = extractOASFSkills(agent.rawMetadata);
      if (oasfNames.length > 0) {
        oasfSkills = oasfNames.map((name) => ({
          name,
          description: "",
          category: "other" as const,
          inputTypes: [],
          outputTypes: [],
          version: "oasf",
        }));
        console.log(
          `[Indexer] Found ${oasfSkills.length} OASF skill(s) for agent ${agent.agentId}`
        );
      }
    } catch {
      // OASF extraction failed — continue
    }
  }

  // ─────────────────────────────────────
  // Source 3: SelfClaw skill marketplace
  // Look up by wallet → publicKey → skills
  // ─────────────────────────────────────
  let selfClawParsedSkills: AgentSkill[] = [];

  try {
    const selfClawAgent = await getSelfClawAgentByWallet(
      agent.walletAddress
    );

    if (selfClawAgent?.publicKey) {
      const selfClawSkills = await getAgentSelfClawSkills(
        selfClawAgent.publicKey // ← publicKey not agentName
      );
      selfClawParsedSkills = parseSelfClawSkills(selfClawSkills);

      if (selfClawParsedSkills.length > 0) {
        console.log(
          `[Indexer] Found ${selfClawParsedSkills.length} SelfClaw skill(s) for agent ${agent.agentId}`
        );
      }
    }
  } catch {
    // SelfClaw lookup failed — continue
  }

  // ─────────────────────────────────────
  // Source 4: Protocol-inferred skills
  // from 8004scan supported_protocols
  // Also checks metadata services array
  // ─────────────────────────────────────
  let protocolSkills: AgentSkill[] = [];

  try {
    // First try metadata services directly
    if (agent.rawMetadata?.services?.length) {
      const protocols = extractProtocols(agent.rawMetadata);
      if (protocols.length > 0) {
        protocolSkills = inferSkillsFromProtocols(protocols);
      }
    }

    // Fall back to 8004scan if no protocols from metadata
    if (protocolSkills.length === 0) {
      const scan8004Agent = await getAgent(agent.agentId, agent.network);
      if (scan8004Agent?.supported_protocols?.length) {
        protocolSkills = inferSkillsFromProtocols(
          scan8004Agent.supported_protocols
        );
      }
    }

    if (protocolSkills.length > 0) {
      console.log(
        `[Indexer] Inferred ${protocolSkills.length} skill(s) from protocols for agent ${agent.agentId}`
      );
    }
  } catch {
    // Protocol lookup failed — continue
  }

  // ─────────────────────────────────────
  // Merge all four sources
  // Priority: skill.md > OASF > SelfClaw > protocol
  // ─────────────────────────────────────
  const mergedSkills = mergeSkillSources(
    skillMdSkills,
    [...oasfSkills, ...selfClawParsedSkills],
    protocolSkills
  );

  // ─────────────────────────────────────
  // Build embedding text
  // Fall back to agent identity if no skills
  // so agent still appears in discovery
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
      `[Indexer] Agent ${agent.agentId} has no skills — indexing from identity only`
    );
  } else {
    console.log(
      `[Indexer] Agent ${agent.agentId} — ` +
      `${skillMdSkills.length} skill.md, ` +
      `${oasfSkills.length} OASF, ` +
      `${selfClawParsedSkills.length} SelfClaw, ` +
      `${protocolSkills.length} inferred`
    );
  }

  // ─────────────────────────────────────
  // Resolve x402 endpoint from metadata
  // if not already set on the agent record
  // ─────────────────────────────────────
  const x402Endpoint =
    agent.x402Endpoint ??
    (agent.rawMetadata ? extractX402Endpoint(agent.rawMetadata) : null);

  // ─────────────────────────────────────
  // Generate embedding and store in pgvector
  // ─────────────────────────────────────
  const embedding = await generateEmbedding(embeddingText);

  await upsertSkillVector(agent.agentId, agent.network, embedding, {
    name: agent.name,
    skills: mergedSkills.map((s: any) => s.name),
    categories: [...new Set(mergedSkills.map((s: any) => s.category))],
    x402Endpoint,
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

export function startIngester(): () => void {
  console.log("[Ingester] Starting...");
  const stopWatchers = startRegistryWatchers();
  console.log(
    "[Ingester] Running — listening for new agents on mainnet & testnet"
  );
  return () => {
    stopWatchers();
    console.log("[Ingester] Stopped");
  };
}