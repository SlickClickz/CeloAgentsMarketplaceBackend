import express from "express";
import { env } from "../config/env";
import { resolveNetwork } from "../middleware/resolveNetwork";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFound } from "./middleware/errorHandler";
import discoveryRouter from "./routes/discovery";
import agentRouter from "./routes/agent";
import scoreRouter from "./routes/score";
import networkRouter from "./routes/network";
import hireRouter from "./routes/hire";
import { pingDb } from "../db/client";
import { pingChroma } from "../indexer/vector";
import { pingSelfClaw } from "../lib/selfclaw";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Celo-Network, X-Payment"
    );
    next();
  });

  app.use("/api", generalLimiter);
  app.use("/api/v1", resolveNetwork);

  app.use("/api/v1/discovery", discoveryRouter);
  app.use("/api/v1/agent", agentRouter);
  app.use("/api/v1/score", scoreRouter);
  app.use("/api/v1/networks", networkRouter);
  app.use("/api/v1/hire", hireRouter);

  // ─────────────────────────────────────
  // Health check
  // ─────────────────────────────────────
  // app.get("/health", async (_req, res) => {
  //   const [dbOk, vectorOk] = await Promise.all([
  //     pingDb(),
  //     pingChroma(),
  //   ]);

  //   const status = dbOk ? "ok" : "degraded";

  //   res.status(status === "ok" ? 200 : 503).json({
  //     status,
  //     services: {
  //       database: dbOk ? "ok" : "unreachable",
  //       vectorSearch: vectorOk ? "ok" : "unreachable",
  //     },
  //     timestamp: new Date().toISOString(),
  //   });
  // });
  
  app.get("/health", async (_req, res) => {
  const [dbOk, selfClawOk] = await Promise.all([
    pingDb(),
    pingSelfClaw(),
  ]);

  const status = dbOk ? "ok" : "degraded";

  res.status(status === "ok" ? 200 : 503).json({
    status,
    services: {
      database: dbOk ? "ok" : "unreachable",
      selfclaw: selfClawOk ? "ok" : "unreachable",
      scan8004: "external",
    },
    timestamp: new Date().toISOString(),
  });
});

  app.use(notFound);
  app.use(errorHandler);

  return app;
}