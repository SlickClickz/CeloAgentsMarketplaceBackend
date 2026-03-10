import { PrismaClient } from "@prisma/client";
import { AgentMetadata, AgentSkill, CAMScore, AgentFlag } from "../types/agent";
import { CeloNetwork } from "../config/env";

// ─────────────────────────────────────────
// Singleton Prisma client
// ─────────────────────────────────────────
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ─────────────────────────────────────────
// CeloNetwork maps directly to Prisma enum
// values "mainnet" and "testnet" — no
// conversion needed, just cast as any
// ─────────────────────────────────────────
function toDb(network: CeloNetwork) {
  return network as any;
}

// ─────────────────────────────────────────
// Retry wrapper — handles Neon idle
// connection drops transparently
// ─────────────────────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnectionError =
        err.message?.includes("Closed") ||
        err.message?.includes("Connection") ||
        err.message?.includes("ECONNRESET") ||
        err.code === "P1001" ||
        err.code === "P1017";

      if (isConnectionError && attempt < retries) {
        console.warn(
          `[DB] Connection error on attempt ${attempt}/${retries}, retrying in ${delayMs * attempt}ms...`
        );
        await sleep(delayMs * attempt);
        continue;
      }
      throw err;
    }
  }
  throw new Error("[DB] withRetry exhausted all attempts");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────
// Public API — all wrapped with retry
// ─────────────────────────────────────────
export async function upsertAgent(agent: AgentMetadata): Promise<void> {
  return withRetry(() => _upsertAgent(agent));
}

export async function upsertScore(score: CAMScore): Promise<void> {
  return withRetry(() => _upsertScore(score));
}

export async function getAgentById(
  agentId: string,
  network: CeloNetwork
): Promise<AgentMetadata | null> {
  return withRetry(() => _getAgentById(agentId, network));
}

export async function getAllAgentIds(
  network: CeloNetwork
): Promise<string[]> {
  return withRetry(() => _getAllAgentIds(network));
}

export async function getAgentsWithScores(
  network: CeloNetwork,
  agentIds: string[],
  minScore?: number
): Promise<any[]> {
  return withRetry(() => _getAgentsWithScores(network, agentIds, minScore));
}

export async function getLastBlock(
  network: CeloNetwork
): Promise<bigint> {
  return withRetry(() => _getLastBlock(network));
}

export async function setLastBlock(
  network: CeloNetwork,
  blockNumber: bigint
): Promise<void> {
  return withRetry(() => _setLastBlock(network, blockNumber));
}

export async function pingDb(): Promise<boolean> {
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────
// Internal implementations
// ─────────────────────────────────────────
async function _upsertAgent(agent: AgentMetadata): Promise<void> {
  await prisma.$transaction(
    async (tx: any) => {
      await tx.agent.upsert({
        where: {
          agentId_network: {
            agentId: agent.agentId,
            network: toDb(agent.network),
          },
        },
        create: {
          agentId: agent.agentId,
          network: toDb(agent.network),
          walletAddress: agent.walletAddress,
          tokenURI: agent.tokenURI,
          name: agent.name,
          description: agent.description,
          x402Endpoint: agent.x402Endpoint,
          selfClawVerified: agent.selfClawVerified,
          rawSkillMd: agent.rawSkillMd,
          registrationTimestamp: agent.registrationTimestamp,
          lastIndexedAt: new Date(),
        },
        update: {
          walletAddress: agent.walletAddress,
          tokenURI: agent.tokenURI,
          name: agent.name,
          description: agent.description,
          x402Endpoint: agent.x402Endpoint,
          selfClawVerified: agent.selfClawVerified,
          rawSkillMd: agent.rawSkillMd,
          lastIndexedAt: new Date(),
        },
      });

      // Replace skills — delete old, insert new
      await tx.agentSkill.deleteMany({
        where: {
          agentId: agent.agentId,
          network: toDb(agent.network),
        },
      });

      if (agent.skills.length > 0) {
        await tx.agentSkill.createMany({
          data: agent.skills.map((skill) => ({
            agentId: agent.agentId,
            network: toDb(agent.network),
            name: skill.name,
            description: skill.description,
            category: skill.category.replace(/-/g, "_") as any,
            inputTypes: skill.inputTypes,
            outputTypes: skill.outputTypes,
            version: skill.version,
          })),
        });
      }
    },
    { timeout: 15000 } // ← increased from default 5000ms
  );
}

async function _upsertScore(score: CAMScore): Promise<void> {
  await prisma.$transaction(
    async (tx: any) => {
      await tx.agentScore.upsert({
        where: {
          agentId_network: {
            agentId: score.agentId,
            network: toDb(score.network),
          },
        },
        create: {
          agentId: score.agentId,
          network: toDb(score.network),
          total: score.total,
          identityScore: score.breakdown.identity,
          executionScore: score.breakdown.execution,
          integrityScore: score.breakdown.skillIntegrity,
          lastUpdated: score.lastUpdated,
        },
        update: {
          total: score.total,
          identityScore: score.breakdown.identity,
          executionScore: score.breakdown.execution,
          integrityScore: score.breakdown.skillIntegrity,
          lastUpdated: score.lastUpdated,
        },
      });

      // Append to score history
      await tx.agentScoreHistory.create({
        data: {
          agentId: score.agentId,
          network: toDb(score.network),
          total: score.total,
          identityScore: score.breakdown.identity,
          executionScore: score.breakdown.execution,
          integrityScore: score.breakdown.skillIntegrity,
          recordedAt: score.lastUpdated,
        },
      });

      // Replace flags
      await tx.agentFlagRecord.deleteMany({
        where: {
          agentId: score.agentId,
          network: toDb(score.network),
        },
      });

      if (score.flags.length > 0) {
        await tx.agentFlagRecord.createMany({
          data: score.flags.map((flag) => ({
            agentId: score.agentId,
            network: toDb(score.network),
            type: flag.type as any,
            message: flag.message,
            severity: flag.severity as any,
          })),
        });
      }
    },
    { timeout: 15000 } // ← increased from default 5000ms
  );
}

async function _getAgentById(
  agentId: string,
  network: CeloNetwork
): Promise<AgentMetadata | null> {
  const record = await prisma.agent.findUnique({
    where: {
      agentId_network: {
        agentId,
        network: toDb(network),
      },
    },
    include: { skills: true },
  });

  if (!record) return null;

  return {
    agentId: record.agentId,
    walletAddress: record.walletAddress as `0x${string}`,
    tokenURI: record.tokenURI,
    name: record.name,
    description: record.description,
    x402Endpoint: record.x402Endpoint,
    selfClawVerified: record.selfClawVerified,
    network,
    registrationTimestamp: record.registrationTimestamp,
    rawSkillMd: record.rawSkillMd,
    skills: record.skills.map((s: any) => ({
      name: s.name,
      description: s.description,
      category: s.category.replace(/_/g, "-") as AgentSkill["category"],
      inputTypes: s.inputTypes,
      outputTypes: s.outputTypes,
      version: s.version,
    })),
  };
}

async function _getAllAgentIds(
  network: CeloNetwork
): Promise<string[]> {
  const records = await prisma.agent.findMany({
    where: { network: toDb(network) },
    select: { agentId: true },
  });
  return records.map((r: any) => r.agentId);
}

async function _getAgentsWithScores(
  network: CeloNetwork,
  agentIds: string[],
  minScore?: number
): Promise<any[]> {
  const records = await prisma.agent.findMany({
    where: {
      agentId: { in: agentIds },
      network: toDb(network),
      ...(minScore
        ? { score: { total: { gte: minScore } } }
        : {}),
    },
    include: {
      skills: true,
      score: true,
      flags: true,
    },
    orderBy: {
      score: { total: "desc" },
    },
  });

  return records.map((r: any) => ({
    agentId: r.agentId,
    name: r.name,
    description: r.description,
    x402Endpoint: r.x402Endpoint,
    registrationTimestamp: r.registrationTimestamp,
    skills: r.skills.map((s: any) => ({
      name: s.name,
      description: s.description,
      category: s.category.replace(/_/g, "-") as AgentSkill["category"],
      inputTypes: s.inputTypes,
      outputTypes: s.outputTypes,
      version: s.version,
    })),
    score: r.score
      ? {
          agentId: r.agentId,
          network,
          total: r.score.total,
          breakdown: {
            identity: r.score.identityScore,
            execution: r.score.executionScore,
            skillIntegrity: r.score.integrityScore,
          },
          flags: [],
          lastUpdated: r.score.lastUpdated,
        }
      : null,
    flags: r.flags.map((f: any) => ({
      type: f.type as AgentFlag["type"],
      message: f.message,
      severity: f.severity as AgentFlag["severity"],
    })),
  }));
}

async function _getLastBlock(
  network: CeloNetwork
): Promise<bigint> {
  const state = await prisma.ingesterState.findUnique({
    where: { network: toDb(network) },
  });
  return state?.lastBlock ?? BigInt(0);
}

async function _setLastBlock(
  network: CeloNetwork,
  blockNumber: bigint
): Promise<void> {
  await prisma.ingesterState.upsert({
    where: { network: toDb(network) },
    create: {
      network: toDb(network),
      lastBlock: blockNumber,
    },
    update: {
      lastBlock: blockNumber,
    },
  });
}