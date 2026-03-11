"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const resolveNetwork_1 = require("../middleware/resolveNetwork");
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const discovery_1 = __importDefault(require("./routes/discovery"));
const agent_1 = __importDefault(require("./routes/agent"));
const score_1 = __importDefault(require("./routes/score"));
const network_1 = __importDefault(require("./routes/network"));
const hire_1 = __importDefault(require("./routes/hire"));
const client_1 = require("../db/client");
const selfclaw_1 = require("../lib/selfclaw");
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((_req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Celo-Network, X-Payment");
        next();
    });
    app.use("/api", rateLimit_1.generalLimiter);
    app.use("/api/v1", resolveNetwork_1.resolveNetwork);
    app.use("/api/v1/discovery", discovery_1.default);
    app.use("/api/v1/agent", agent_1.default);
    app.use("/api/v1/score", score_1.default);
    app.use("/api/v1/networks", network_1.default);
    app.use("/api/v1/hire", hire_1.default);
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
            (0, client_1.pingDb)(),
            (0, selfclaw_1.pingSelfClaw)(),
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
    app.use(errorHandler_1.notFound);
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=index.js.map