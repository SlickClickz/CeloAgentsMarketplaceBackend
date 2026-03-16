"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
const env_1 = require("./config/env");
const ingester_1 = require("./ingester");
const scheduler_1 = require("./scoring/scheduler");
const client_1 = require("./db/client");
const queue_1 = require("./ingester/queue");
const client_2 = require("./db/client");
const indexer_1 = require("./indexer");
const scoring_1 = require("./scoring");
const metadata_1 = require("./ingester/metadata");
const skillParser_1 = require("./indexer/skillParser");
async function processNewAgent(event) {
    try {
        console.log(`[Queue] Processing new agent ${event.agentId} on ${event.network}`);
        let skills = [];
        let rawSkillMd = "";
        let x402Endpoint = null;
        // Try to resolve skill.md from tokenURI
        if (event.tokenURI &&
            (event.tokenURI.startsWith("ipfs://") ||
                event.tokenURI.startsWith("https://"))) {
            try {
                const metadata = await (0, metadata_1.resolveTokenURI)(event.tokenURI);
                rawSkillMd = await (0, metadata_1.fetchSkillMd)(metadata.skillMdUrl);
                skills = (0, skillParser_1.parseSkillMd)(rawSkillMd);
                x402Endpoint = metadata.x402Endpoint ?? null;
            }
            catch {
                // skill.md not available — indexer will use other sources
            }
        }
        const agentRecord = {
            agentId: event.agentId.toString(),
            walletAddress: event.owner,
            tokenURI: event.tokenURI,
            name: `Agent #${event.agentId}`,
            description: "",
            skills,
            x402Endpoint,
            selfClawVerified: false,
            network: event.network,
            registrationTimestamp: event.timestamp,
            rawSkillMd,
        };
        await (0, client_2.upsertAgent)(agentRecord);
        await (0, indexer_1.indexAgentSkills)(agentRecord);
        await (0, scoring_1.computeAndStoreScore)(event.agentId.toString(), event.network);
        console.log(`[Queue] ✅ Agent ${event.agentId} on ${event.network} fully processed`);
    }
    catch (err) {
        console.error(`[Queue] ❌ Failed to process agent ${event.agentId}: ${err.message}`);
    }
}
async function main() {
    console.log("\n🌿 Celo Agent Marketplace (CAM) — Starting up\n");
    // ─────────────────────────────────────────
    // Database connection
    // ─────────────────────────────────────────
    try {
        await client_1.prisma.$connect();
        console.log("✅ PostgreSQL connected");
    }
    catch (err) {
        console.error("❌ PostgreSQL connection failed:", err);
        process.exit(1);
    }
    // ─────────────────────────────────────────
    // Keep-alive ping every 4 minutes
    // Neon drops idle connections after ~5 min
    // ─────────────────────────────────────────
    setInterval(async () => {
        try {
            await client_1.prisma.$queryRaw `SELECT 1`;
        }
        catch {
            // Silent — withRetry in db/client handles reconnection
        }
    }, 4 * 60 * 1000);
    // ─────────────────────────────────────────
    // Register queue processor BEFORE starting
    // the ingester so no events are missed
    // This was the missing piece — new agents
    // were detected but never processed
    // ─────────────────────────────────────────
    (0, queue_1.registerProcessor)(processNewAgent);
    console.log("✅ Queue processor registered");
    // ─────────────────────────────────────────
    // Start ingester — watches both chains
    // ─────────────────────────────────────────
    const stopIngester = (0, ingester_1.startIngester)();
    console.log("✅ Ingester started (mainnet + testnet)");
    // ─────────────────────────────────────────
    // Start score scheduler — 6hr cron
    // 5 minute delay on startup so server
    // is fully warmed up before hitting APIs
    // ─────────────────────────────────────────
    (0, scheduler_1.startScoreScheduler)();
    console.log("✅ Score scheduler started");
    // ─────────────────────────────────────────
    // Start API server
    // ─────────────────────────────────────────
    const app = (0, api_1.createApp)();
    const server = app.listen(env_1.env.port, "0.0.0.0", () => {
        console.log(`✅ API server running on port ${env_1.env.port}`);
        console.log(`\n📡 Endpoints:`);
        console.log(`   GET  /api/v1/discovery?query=...&network=mainnet|testnet`);
        console.log(`   GET  /api/v1/agent/:agentId?network=mainnet|testnet`);
        console.log(`   GET  /api/v1/agent/:agentId/score/history`);
        console.log(`   POST /api/v1/score/refresh/:agentId`);
        console.log(`   GET  /api/v1/networks`);
        console.log(`   GET  /health`);
        console.log(`\n🟢 CAM is live\n`);
    });
    // ─────────────────────────────────────────
    // Graceful shutdown
    // ─────────────────────────────────────────
    const shutdown = async (signal) => {
        console.log(`\n[CAM] ${signal} received — shutting down gracefully`);
        stopIngester();
        server.close(async () => {
            await client_1.prisma.$disconnect();
            console.log("[CAM] Shutdown complete");
            process.exit(0);
        });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
main().catch((err) => {
    console.error("❌ Fatal startup error:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map