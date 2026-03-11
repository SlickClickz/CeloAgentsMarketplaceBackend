"use strict";
// import { Request, Response, NextFunction } from "express";
// import { createThirdwebClient, toWei } from "thirdweb";
// import { celo, celoSepoliaTestnet } from "thirdweb/chains";
// import { env, chainRegistry, CeloNetwork } from "../config/env";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePayment = requirePayment;
exports.buildPaymentConfig = buildPaymentConfig;
const env_1 = require("../config/env");
// ─────────────────────────────────────────
// x402 Payment Required response
// Follows x402 protocol spec
// ─────────────────────────────────────────
function build402Response(config, resource) {
    const chain = env_1.chainRegistry[config.network];
    const tokenAddress = config.token === "cUSD"
        ? chain.stablecoins.cUSD
        : chain.stablecoins.USDC;
    // Convert USD to smallest unit (6 decimals)
    const amountInUnits = Math.round(config.priceUsd * 1_000_000).toString();
    return {
        x402Version: 1,
        accepts: [
            {
                scheme: "exact",
                network: config.network === "mainnet" ? "celo" : "celo-sepolia",
                maxAmountRequired: amountInUnits,
                resource,
                description: "Payment required to interact with this agent",
                mimeType: "application/json",
                payTo: config.recipient,
                maxTimeoutSeconds: 300,
                asset: tokenAddress,
                extra: {
                    name: config.token,
                    version: "1",
                },
            },
        ],
        error: "X-PAYMENT header is required",
    };
}
// ─────────────────────────────────────────
// Verify payment via tx hash
// Frontend sends X-Payment-Tx header with
// the on-chain transaction hash
// We do a basic structural check here —
// full on-chain verification can be added
// in V2 via an RPC receipt lookup
// ─────────────────────────────────────────
async function verifyPaymentProof(req, config) {
    const txHash = req.headers["x-payment-tx"];
    const tokenAddress = req.headers["x-payment-token"];
    const amount = req.headers["x-payment-amount"];
    const jobId = req.headers["x-payment-job-id"];
    if (!txHash) {
        return { valid: false, error: "Missing X-Payment-Tx header" };
    }
    if (!txHash.startsWith("0x") || txHash.length !== 66) {
        return { valid: false, error: "Invalid transaction hash format" };
    }
    if (!tokenAddress || !amount) {
        return { valid: false, error: "Missing payment token or amount headers" };
    }
    // Verify token matches expected
    const chain = env_1.chainRegistry[config.network];
    const expectedToken = config.token === "cUSD"
        ? chain.stablecoins.cUSD
        : chain.stablecoins.USDC;
    if (tokenAddress.toLowerCase() !== expectedToken.toLowerCase()) {
        return { valid: false, error: "Payment token mismatch" };
    }
    // Verify amount meets minimum (6 decimals)
    const paidUnits = parseFloat(amount) * 1_000_000;
    const requiredUnits = config.priceUsd * 1_000_000;
    if (paidUnits < requiredUnits) {
        return {
            valid: false,
            error: `Insufficient payment: got ${amount}, required ${config.priceUsd}`,
        };
    }
    return { valid: true };
}
// ─────────────────────────────────────────
// x402 middleware factory
// Wraps any Express route to require payment
//
// Usage:
//   router.post("/run",
//     requirePayment(config),
//     runAgentHandler
//   )
// ─────────────────────────────────────────
function requirePayment(config) {
    return async (req, res, next) => {
        const hasTxProof = !!req.headers["x-payment-tx"];
        const resource = `${req.protocol}://${req.get("host")}${req.path}`;
        // No payment proof — issue 402 challenge
        if (!hasTxProof) {
            res
                .status(402)
                .set("Content-Type", "application/json")
                .json(build402Response(config, resource));
            return;
        }
        // Verify the payment proof
        const { valid, error } = await verifyPaymentProof(req, config);
        if (!valid) {
            res.status(402).json({
                // error: "Payment verification failed",
                reason: error,
                ...build402Response(config, resource),
            });
            return;
        }
        // Payment verified — attach to req for downstream handlers
        req.paymentConfig = config;
        req.paymentVerified = true;
        req.paymentTxHash = req.headers["x-payment-tx"];
        next();
    };
}
// ─────────────────────────────────────────
// Helper — build payment config from
// agent record
// ─────────────────────────────────────────
function buildPaymentConfig(agentWalletAddress, network, priceUsd = 0.01, token = "cUSD") {
    return {
        priceUsd,
        token,
        recipient: agentWalletAddress,
        network,
    };
}
//# sourceMappingURL=x402.js.map