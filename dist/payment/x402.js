"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePayment = requirePayment;
exports.buildPaymentConfig = buildPaymentConfig;
const thirdweb_1 = require("thirdweb");
const env_1 = require("../config/env");
// ─────────────────────────────────────────
// Thirdweb client — singleton
// ─────────────────────────────────────────
const thirdwebClient = (0, thirdweb_1.createThirdwebClient)({
    secretKey: env_1.env.thirdwebSecretKey,
});
// ─────────────────────────────────────────
// Build the 402 response payload
// ─────────────────────────────────────────
function build402Response(config, resource) {
    const chain = env_1.chainRegistry[config.network];
    const networkName = config.network === "mainnet" ? "base" : "base-sepolia";
    // Note: x402 uses "base" network naming convention
    // but we pass Celo contract addresses
    const tokenAddress = config.token === "cUSD"
        ? chain.stablecoins.cUSD
        : chain.stablecoins.USDC;
    return {
        x402Version: 1,
        accepts: [
            {
                scheme: "exact",
                network: networkName,
                maxAmountRequired: config.priceWei.toString(),
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
// Verify payment proof from X-PAYMENT header
// Thirdweb x402 SDK sends a signed payment
// proof that we verify before processing
// ─────────────────────────────────────────
async function verifyPaymentProof(paymentHeader, config, resource) {
    try {
        // Decode base64 payment proof
        const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
        const proof = JSON.parse(decoded);
        // Basic structural validation
        if (!proof.payload || !proof.payload.authorization) {
            return { valid: false, error: "Malformed payment proof" };
        }
        const auth = proof.payload.authorization;
        // Verify recipient matches agent wallet
        if (auth.to?.toLowerCase() !== config.recipient.toLowerCase()) {
            return { valid: false, error: "Payment recipient mismatch" };
        }
        // Verify amount meets minimum
        const paidAmount = BigInt(auth.value ?? "0");
        if (paidAmount < config.priceWei) {
            return {
                valid: false,
                error: `Insufficient payment: got ${paidAmount}, required ${config.priceWei}`,
            };
        }
        // Verify token address
        const chain = env_1.chainRegistry[config.network];
        const expectedToken = config.token === "cUSD"
            ? chain.stablecoins.cUSD
            : chain.stablecoins.USDC;
        if (auth.token?.toLowerCase() !== expectedToken.toLowerCase()) {
            return { valid: false, error: "Invalid payment token" };
        }
        // Verify expiry
        const deadline = Number(auth.validBefore ?? 0);
        if (deadline < Math.floor(Date.now() / 1000)) {
            return { valid: false, error: "Payment proof expired" };
        }
        return { valid: true };
    }
    catch (err) {
        return { valid: false, error: `Payment verification failed: ${err.message}` };
    }
}
// ─────────────────────────────────────────
// x402 middleware factory
// Wrap any Express route to require payment
//
// Usage:
//   router.post("/run",
//     requirePayment(agentPaymentConfig),
//     runAgentHandler
//   )
// ─────────────────────────────────────────
function requirePayment(config) {
    return async (req, res, next) => {
        const paymentHeader = req.headers["x-payment"];
        const resource = `${req.protocol}://${req.get("host")}${req.path}`;
        // No payment header — issue 402 challenge
        if (!paymentHeader) {
            res
                .status(402)
                .set("Content-Type", "application/json")
                .json(build402Response(config, resource));
            return;
        }
        // Verify the payment proof
        const { valid, error } = await verifyPaymentProof(paymentHeader, config, resource);
        if (!valid) {
            res.status(402).json({
                // error: "Payment verification failed",
                reason: error,
                ...build402Response(config, resource),
            });
            return;
        }
        // Payment verified — attach config to req for
        // downstream handlers to log/reference if needed
        req.paymentConfig = config;
        req.paymentVerified = true;
        next();
    };
}
// ─────────────────────────────────────────
// Helper — build payment config from
// agent record (used by hire endpoint)
// ─────────────────────────────────────────
function buildPaymentConfig(agentWalletAddress, network, priceUsd = 0.01, // default $0.01 per interaction
token = "cUSD") {
    // Convert USD price to wei (stablecoins are 18 decimals on Celo)
    const priceWei = (0, thirdweb_1.toWei)(priceUsd.toString());
    return {
        priceWei,
        token,
        recipient: agentWalletAddress,
        network,
    };
}
//# sourceMappingURL=x402.js.map