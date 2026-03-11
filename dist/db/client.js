"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.withRetry = withRetry;
exports.upsertAgent = upsertAgent;
exports.upsertScore = upsertScore;
exports.getAgentById = getAgentById;
exports.getAllAgentIds = getAllAgentIds;
exports.getAgentsWithScores = getAgentsWithScores;
exports.getLastBlock = getLastBlock;
exports.setLastBlock = setLastBlock;
exports.pingDb = pingDb;
const client_1 = require("@prisma/client");
// ─────────────────────────────────────────
// Singleton Prisma client
// ─────────────────────────────────────────
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["error", "warn"]
            : ["error"],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
}
// ─────────────────────────────────────────
// CeloNetwork maps directly to Prisma enum
// values "mainnet" and "testnet" — no
// conversion needed, just cast as any
// ─────────────────────────────────────────
function toDb(network) {
    return network;
}
// ─────────────────────────────────────────
// Retry wrapper — handles Neon idle
// connection drops transparently
// ─────────────────────────────────────────
async function withRetry(fn, retries = 3, delayMs = 500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            const isConnectionError = err.message?.includes("Closed") ||
                err.message?.includes("Connection") ||
                err.message?.includes("ECONNRESET") ||
                err.code === "P1001" ||
                err.code === "P1017";
            if (isConnectionError && attempt < retries) {
                console.warn(`[DB] Connection error on attempt ${attempt}/${retries}, retrying in ${delayMs * attempt}ms...`);
                await sleep(delayMs * attempt);
                continue;
            }
            throw err;
        }
    }
    throw new Error("[DB] withRetry exhausted all attempts");
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ─────────────────────────────────────────
// Public API — all wrapped with retry
// ─────────────────────────────────────────
async function upsertAgent(agent) {
    return withRetry(() => _upsertAgent(agent));
}
async function upsertScore(score) {
    return withRetry(() => _upsertScore(score));
}
async function getAgentById(agentId, network) {
    return withRetry(() => _getAgentById(agentId, network));
}
async function getAllAgentIds(network) {
    return withRetry(() => _getAllAgentIds(network));
}
async function getAgentsWithScores(network, agentIds, minScore) {
    return withRetry(() => _getAgentsWithScores(network, agentIds, minScore));
}
async function getLastBlock(network) {
    return withRetry(() => _getLastBlock(network));
}
async function setLastBlock(network, blockNumber) {
    return withRetry(() => _setLastBlock(network, blockNumber));
}
async function pingDb() {
    try {
        await withRetry(() => exports.prisma.$queryRaw `SELECT 1`);
        return true;
    }
    catch {
        return false;
    }
}
// ─────────────────────────────────────────
// Internal implementations
// ─────────────────────────────────────────
async function _upsertAgent(agent) {
    await exports.prisma.$transaction(async (tx) => {
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
                    category: skill.category.replace(/-/g, "_"),
                    inputTypes: skill.inputTypes,
                    outputTypes: skill.outputTypes,
                    version: skill.version,
                })),
            });
        }
    }, { timeout: 15000 } // ← increased from default 5000ms
    );
}
async function _upsertScore(score) {
    await exports.prisma.$transaction(async (tx) => {
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
                    type: flag.type,
                    message: flag.message,
                    severity: flag.severity,
                })),
            });
        }
    }, { timeout: 15000 } // ← increased from default 5000ms
    );
}
async function _getAgentById(agentId, network) {
    const record = await exports.prisma.agent.findUnique({
        where: {
            agentId_network: {
                agentId,
                network: toDb(network),
            },
        },
        include: { skills: true },
    });
    if (!record)
        return null;
    return {
        agentId: record.agentId,
        walletAddress: record.walletAddress,
        tokenURI: record.tokenURI,
        name: record.name,
        description: record.description,
        x402Endpoint: record.x402Endpoint,
        selfClawVerified: record.selfClawVerified,
        network,
        registrationTimestamp: record.registrationTimestamp,
        rawSkillMd: record.rawSkillMd,
        skills: record.skills.map((s) => ({
            name: s.name,
            description: s.description,
            category: s.category.replace(/_/g, "-"),
            inputTypes: s.inputTypes,
            outputTypes: s.outputTypes,
            version: s.version,
        })),
    };
}
async function _getAllAgentIds(network) {
    const records = await exports.prisma.agent.findMany({
        where: { network: toDb(network) },
        select: { agentId: true },
    });
    return records.map((r) => r.agentId);
}
async function _getAgentsWithScores(network, agentIds, minScore) {
    const records = await exports.prisma.agent.findMany({
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
    return records.map((r) => ({
        agentId: r.agentId,
        name: r.name,
        description: r.description,
        x402Endpoint: r.x402Endpoint,
        registrationTimestamp: r.registrationTimestamp,
        skills: r.skills.map((s) => ({
            name: s.name,
            description: s.description,
            category: s.category.replace(/_/g, "-"),
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
        flags: r.flags.map((f) => ({
            type: f.type,
            message: f.message,
            severity: f.severity,
        })),
    }));
}
async function _getLastBlock(network) {
    const state = await exports.prisma.ingesterState.findUnique({
        where: { network: toDb(network) },
    });
    return state?.lastBlock ?? BigInt(0);
}
async function _setLastBlock(network, blockNumber) {
    await exports.prisma.ingesterState.upsert({
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
//# sourceMappingURL=client.js.map