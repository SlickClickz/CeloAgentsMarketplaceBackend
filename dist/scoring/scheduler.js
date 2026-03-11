"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScoreScheduler = startScoreScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("../db/client");
const index_1 = require("./index");
// ─────────────────────────────────────────
// Process agents in small batches with
// delays to avoid rate limiting across
// 8004scan (30/min), SelfClaw (60/min),
// and Neon connection pool limits
// ─────────────────────────────────────────
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 8000; // was 3000
const AGENT_DELAY_MS = 2500; // was 1000
async function refreshNetworkScores(network) {
    const agentIds = await (0, client_1.getAllAgentIds)(network);
    if (agentIds.length === 0) {
        console.log(`[Scheduler] No agents found on ${network}`);
        return;
    }
    console.log(`[Scheduler] Refreshing scores for ${agentIds.length} agents on ${network}`);
    let processed = 0;
    let failed = 0;
    // Process in batches
    for (let i = 0; i < agentIds.length; i += BATCH_SIZE) {
        const batch = agentIds.slice(i, i + BATCH_SIZE);
        // Process batch sequentially — not in parallel
        // to avoid hammering external APIs
        for (const agentId of batch) {
            try {
                await (0, index_1.computeAndStoreScore)(agentId, network);
                processed++;
            }
            catch (err) {
                failed++;
                console.error(`[Scheduler] Failed to score agent ${agentId}: ${err.message}`);
            }
            // Delay between agents
            await sleep(AGENT_DELAY_MS);
        }
        // Delay between batches
        if (i + BATCH_SIZE < agentIds.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }
    console.log(`[Scheduler][${network}] Complete — ` +
        `processed: ${processed}, failed: ${failed}`);
}
async function runFullRefresh() {
    console.log("[Scheduler] Starting full score refresh...");
    const start = Date.now();
    // Run networks sequentially — not in parallel
    // to halve the rate limit pressure
    await refreshNetworkScores("mainnet");
    await refreshNetworkScores("testnet");
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[Scheduler] Full refresh complete in ${elapsed}s`);
}
function startScoreScheduler() {
    console.log("[Scheduler] Starting score refresh scheduler (every 6 hours)");
    // Run once on startup — with a delay so the
    // server is fully ready before we hit external APIs
    setTimeout(() => {
        runFullRefresh().catch((err) => console.error("[Scheduler] Startup refresh failed:", err.message));
    }, 5 * 60 * 1000); // 5 minute delay on startup
    // Then every 6 hours
    node_cron_1.default.schedule("0 */6 * * *", () => {
        runFullRefresh().catch((err) => console.error("[Scheduler] Scheduled refresh failed:", err.message));
    });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=scheduler.js.map