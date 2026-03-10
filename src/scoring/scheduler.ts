import cron from "node-cron";
import { getAllAgentIds } from "../db/client";
import { computeAndStoreScore } from "./index";
import { CeloNetwork } from "../config/env";

// ─────────────────────────────────────────
// Process agents in small batches with
// delays to avoid rate limiting across
// 8004scan (30/min), SelfClaw (60/min),
// and Neon connection pool limits
// ─────────────────────────────────────────
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 8000;  // was 3000
const AGENT_DELAY_MS = 2500;  // was 1000

async function refreshNetworkScores(
  network: CeloNetwork
): Promise<void> {
  const agentIds = await getAllAgentIds(network);

  if (agentIds.length === 0) {
    console.log(`[Scheduler] No agents found on ${network}`);
    return;
  }

  console.log(
    `[Scheduler] Refreshing scores for ${agentIds.length} agents on ${network}`
  );

  let processed = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < agentIds.length; i += BATCH_SIZE) {
    const batch = agentIds.slice(i, i + BATCH_SIZE);

    // Process batch sequentially — not in parallel
    // to avoid hammering external APIs
    for (const agentId of batch) {
      try {
        await computeAndStoreScore(agentId, network);
        processed++;
      } catch (err: any) {
        failed++;
        console.error(
          `[Scheduler] Failed to score agent ${agentId}: ${err.message}`
        );
      }

      // Delay between agents
      await sleep(AGENT_DELAY_MS);
    }

    // Delay between batches
    if (i + BATCH_SIZE < agentIds.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(
    `[Scheduler][${network}] Complete — ` +
    `processed: ${processed}, failed: ${failed}`
  );
}

async function runFullRefresh(): Promise<void> {
  console.log("[Scheduler] Starting full score refresh...");
  const start = Date.now();

  // Run networks sequentially — not in parallel
  // to halve the rate limit pressure
  await refreshNetworkScores("mainnet");
  await refreshNetworkScores("testnet");

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[Scheduler] Full refresh complete in ${elapsed}s`);
}

export function startScoreScheduler(): void {
  console.log(
    "[Scheduler] Starting score refresh scheduler (every 6 hours)"
  );

  // Run once on startup — with a delay so the
  // server is fully ready before we hit external APIs
  setTimeout(() => {
    runFullRefresh().catch((err) =>
      console.error("[Scheduler] Startup refresh failed:", err.message)
    );
  }, 5 * 60 * 1000); // 5 minute delay on startup

  // Then every 6 hours
  cron.schedule("0 */6 * * *", () => {
    runFullRefresh().catch((err) =>
      console.error("[Scheduler] Scheduled refresh failed:", err.message)
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}