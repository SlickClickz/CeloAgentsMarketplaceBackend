import { createApp } from "./api";
import { env } from "./config/env";
import { startIngester } from "./ingester";
import { startScoreScheduler } from "./scoring/scheduler";
import { prisma } from "./db/client";
import { registerProcessor } from "./ingester/queue";
import { upsertAgent } from "./db/client";
import { indexAgentSkills } from "./indexer";
import { computeAndStoreScore } from "./scoring";
import { resolveTokenURI, fetchSkillMd } from "./ingester/metadata";
import { parseSkillMd } from "./indexer/skillParser";
import { ERC8004RegisteredEvent } from "./types/erc8004";
import { AgentMetadata } from "./types/agent";

async function processNewAgent(
  event: ERC8004RegisteredEvent
): Promise<void> {
  try {
    console.log(
      `[Queue] Processing new agent ${event.agentId} on ${event.network}`
    );

    let skills: AgentMetadata["skills"] = [];
    let rawSkillMd = "";
    let x402Endpoint: string | null = null;

    // Try to resolve skill.md from tokenURI
    if (
      event.tokenURI &&
      (event.tokenURI.startsWith("ipfs://") ||
        event.tokenURI.startsWith("https://"))
    ) {
      try {
        const metadata = await resolveTokenURI(event.tokenURI);
        rawSkillMd = await fetchSkillMd(metadata.skillMdUrl!);
        skills = parseSkillMd(rawSkillMd);
        x402Endpoint = metadata.x402Endpoint ?? null;
      } catch {
        // skill.md not available — indexer will use other sources
      }
    }

    const agentRecord: AgentMetadata = {
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

    await upsertAgent(agentRecord);
    await indexAgentSkills(agentRecord);
    await computeAndStoreScore(
      event.agentId.toString(),
      event.network
    );

    console.log(
      `[Queue] ✅ Agent ${event.agentId} on ${event.network} fully processed`
    );
  } catch (err: any) {
    console.error(
      `[Queue] ❌ Failed to process agent ${event.agentId}: ${err.message}`
    );
  }
}

async function main() {
  console.log("\n🌿 Celo Agent Marketplace (CAM) — Starting up\n");

  // ─────────────────────────────────────────
  // Database connection
  // ─────────────────────────────────────────
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err);
    process.exit(1);
  }

  // ─────────────────────────────────────────
  // Keep-alive ping every 4 minutes
  // Neon drops idle connections after ~5 min
  // ─────────────────────────────────────────
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // Silent — withRetry in db/client handles reconnection
    }
  }, 4 * 60 * 1000);

  // ─────────────────────────────────────────
  // Register queue processor BEFORE starting
  // the ingester so no events are missed
  // This was the missing piece — new agents
  // were detected but never processed
  // ─────────────────────────────────────────
  registerProcessor(processNewAgent);
  console.log("✅ Queue processor registered");

  // ─────────────────────────────────────────
  // Start ingester — watches both chains
  // ─────────────────────────────────────────
  const stopIngester = startIngester();
  console.log("✅ Ingester started (mainnet + testnet)");

  // ─────────────────────────────────────────
  // Start score scheduler — 6hr cron
  // 5 minute delay on startup so server
  // is fully warmed up before hitting APIs
  // ─────────────────────────────────────────
  startScoreScheduler();
  console.log("✅ Score scheduler started");

  // ─────────────────────────────────────────
  // Start API server
  // ─────────────────────────────────────────
  const app = createApp();
  const server = app.listen(env.port,"0.0.0.0", () => {
    console.log(`✅ API server running on port ${env.port}`);
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
  const shutdown = async (signal: string) => {
    console.log(`\n[CAM] ${signal} received — shutting down gracefully`);
    stopIngester();
    server.close(async () => {
      await prisma.$disconnect();
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