import { prisma, withRetry } from "../db/client";
import { CeloNetwork } from "../config/env";
import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────
// pgvector — store and query embeddings
// directly in PostgreSQL via Neon
// ─────────────────────────────────────────

export async function upsertSkillVector(
  agentId: string,
  network: CeloNetwork,
  embedding: number[],
  metadata: {
    name: string;
    skills: string[];
    categories: string[];
    x402Endpoint: string | null;
    camScore: number;
  }
): Promise<void> {
  const vectorLiteral = `[${embedding.join(",")}]`;

  await withRetry(() =>
    prisma.$executeRaw`
      UPDATE agents
      SET skill_embedding = ${vectorLiteral}::vector
      WHERE "agentId" = ${agentId}
      AND network = ${network}::"Network"
    `
  );
}

// ─────────────────────────────────────────
// Cosine similarity search
// Returns top N agents most similar to query
// ─────────────────────────────────────────
export async function querySkillVectors(
  network: CeloNetwork,
  queryEmbedding: number[],
  topN: number = 10,
  minScore?: number
): Promise<
  {
    agentId: string;
    distance: number;
    metadata: {
      agentId: string;
      network: string;
      name: string;
      skills: string;
      categories: string;
      x402Endpoint: string;
      camScore: number;
    };
  }[]
> {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  // ─────────────────────────────────────
  // Build query conditionally outside
  // of the template literal to avoid
  // nested $queryRaw which causes syntax
  // errors with Prisma's parameter binding
  // ─────────────────────────────────────
  type Row = {
    agentId: string;
    name: string;
    x402Endpoint: string | null;
    distance: number;
    camScore: number | null;
  };

  let results: Row[];

  if (minScore !== undefined) {
    results = await withRetry(() =>
      prisma.$queryRaw<Row[]>`
        SELECT
          a."agentId",
          a.name,
          a."x402Endpoint",
          (a.skill_embedding <=> ${vectorLiteral}::vector) AS distance,
          s.total AS "camScore"
        FROM agents a
        LEFT JOIN agent_scores s
          ON a."agentId" = s."agentId"
          AND a.network = s.network
        WHERE a.network = ${network}::"Network"
          AND a.skill_embedding IS NOT NULL
          AND s.total >= ${minScore}
        ORDER BY a.skill_embedding <=> ${vectorLiteral}::vector
        LIMIT ${topN}
      `
    );
  } else {
    results = await withRetry(() =>
      prisma.$queryRaw<Row[]>`
        SELECT
          a."agentId",
          a.name,
          a."x402Endpoint",
          (a.skill_embedding <=> ${vectorLiteral}::vector) AS distance,
          s.total AS "camScore"
        FROM agents a
        LEFT JOIN agent_scores s
          ON a."agentId" = s."agentId"
          AND a.network = s.network
        WHERE a.network = ${network}::"Network"
          AND a.skill_embedding IS NOT NULL
        ORDER BY a.skill_embedding <=> ${vectorLiteral}::vector
        LIMIT ${topN}
      `
    );
  }

  return results.map((r: any) => ({
    agentId: r.agentId,
    distance: Number(r.distance),
    metadata: {
      agentId: r.agentId,
      network,
      name: r.name,
      skills: "",
      categories: "",
      x402Endpoint: r.x402Endpoint ?? "",
      camScore: r.camScore ?? 0,
    },
  }));
}

// ─────────────────────────────────────────
// Update score in agent_scores table
// (already handled by scoring engine)
// ─────────────────────────────────────────
export async function updateVectorScore(
  agentId: string,
  network: CeloNetwork,
  camScore: number
): Promise<void> {
  // Score is stored in agent_scores table
  // directly by the scoring engine
}

// ─────────────────────────────────────────
// Count indexed agents for a network
// ─────────────────────────────────────────
export async function countIndexed(
  network: CeloNetwork
): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM agents
    WHERE network = ${network}::"Network"
    AND skill_embedding IS NOT NULL
  `;
  return Number(result[0]?.count ?? 0);
}

// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────
export async function pingChroma(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}