"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertSkillVector = upsertSkillVector;
exports.querySkillVectors = querySkillVectors;
exports.updateVectorScore = updateVectorScore;
exports.countIndexed = countIndexed;
exports.pingChroma = pingChroma;
const client_1 = require("../db/client");
// ─────────────────────────────────────────
// pgvector — store and query embeddings
// directly in PostgreSQL via Neon
// ─────────────────────────────────────────
async function upsertSkillVector(agentId, network, embedding, metadata) {
    const vectorLiteral = `[${embedding.join(",")}]`;
    await (0, client_1.withRetry)(() => client_1.prisma.$executeRaw `
      UPDATE agents
      SET skill_embedding = ${vectorLiteral}::vector
      WHERE "agentId" = ${agentId}
      AND network = ${network}::"Network"
    `);
}
// ─────────────────────────────────────────
// Cosine similarity search
// Returns top N agents most similar to query
// ─────────────────────────────────────────
async function querySkillVectors(network, queryEmbedding, topN = 10, minScore) {
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;
    let results;
    if (minScore !== undefined) {
        results = await (0, client_1.withRetry)(() => client_1.prisma.$queryRaw `
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
      `);
    }
    else {
        results = await (0, client_1.withRetry)(() => client_1.prisma.$queryRaw `
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
      `);
    }
    return results.map((r) => ({
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
async function updateVectorScore(agentId, network, camScore) {
    // Score is stored in agent_scores table
    // directly by the scoring engine
}
// ─────────────────────────────────────────
// Count indexed agents for a network
// ─────────────────────────────────────────
async function countIndexed(network) {
    const result = await client_1.prisma.$queryRaw `
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
async function pingChroma() {
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=vector.js.map