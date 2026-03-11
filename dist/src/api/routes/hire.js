"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const x402_1 = require("../../payment/x402");
const client_1 = require("../../db/client");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
// ─────────────────────────────────────────
// POST /api/v1/hire/:agentId
// Initiates a paid interaction with an agent
//
// Flow:
// 1. Lookup agent record
// 2. x402 middleware challenges for payment
// 3. On verified payment, proxy the request
//    to the agent's x402Endpoint
// ─────────────────────────────────────────
router.post("/:agentId", 
// Dynamic middleware — resolve agent first,
// then apply payment requirement
async (req, res, next) => {
    const { agentId } = req.params;
    const { network, chain } = req;
    try {
        const agent = await (0, client_1.getAgentById)(agentId, network);
        if (!agent) {
            res.status(404).json({
                error: {
                    code: "AGENT_NOT_FOUND",
                    message: `Agent ${agentId} not found on ${network}`,
                },
            });
            return;
        }
        if (!agent.x402Endpoint) {
            res.status(400).json({
                error: {
                    code: "NO_PAYMENT_ENDPOINT",
                    message: `Agent ${agentId} has no x402 endpoint configured`,
                },
            });
            return;
        }
        // Attach agent to req for the payment middleware
        req.resolvedAgent = agent;
        // Build payment config from agent wallet + network
        const paymentConfig = (0, x402_1.buildPaymentConfig)(agent.walletAddress, network, 0.01, // $0.01 default — agents can override via metadata
        "cUSD");
        // Apply x402 payment check inline
        (0, x402_1.requirePayment)(paymentConfig)(req, res, async () => {
            // Payment verified — proxy to agent endpoint
            try {
                const agentResponse = await axios_1.default.post(agent.x402Endpoint, req.body, {
                    headers: {
                        "Content-Type": "application/json",
                        "X-CAM-Agent-Id": agentId,
                        "X-CAM-Network": network,
                        "X-CAM-Chain-Id": chain.chainId.toString(),
                        // Forward payment proof to agent
                        "X-Payment": req.headers["x-payment"],
                    },
                    timeout: 30000,
                });
                res.status(agentResponse.status).json({
                    data: agentResponse.data,
                    meta: {
                        agentId,
                        network,
                        chainId: chain.chainId,
                        paymentVerified: true,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            catch (proxyErr) {
                if (axios_1.default.isAxiosError(proxyErr)) {
                    res.status(proxyErr.response?.status ?? 502).json({
                        error: {
                            code: "AGENT_PROXY_ERROR",
                            message: "Agent endpoint returned an error",
                            details: proxyErr.response?.data,
                        },
                    });
                    return;
                }
                next(proxyErr);
            }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=hire.js.map