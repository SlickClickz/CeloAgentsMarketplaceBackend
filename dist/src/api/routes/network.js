"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const env_1 = require("../../config/env");
const wallet_1 = require("../../payment/wallet");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────
// GET /api/v1/networks
// Returns all supported networks, chain
// configs, and Thirdweb wallet configs
// ─────────────────────────────────────────
router.get("/", (_req, res) => {
    const networks = Object.entries(env_1.chainRegistry).map(([key, config]) => ({
        network: key,
        chainId: config.chainId,
        name: config.name,
        rpcUrl: config.rpcUrl,
        blockExplorer: config.blockExplorer,
        isTestnet: config.isTestnet,
        stablecoins: config.stablecoins,
        nativeCurrency: config.nativeCurrency,
    }));
    const walletConfigs = (0, wallet_1.buildAllWalletConfigs)();
    res.json({
        data: {
            networks,
            walletConfigs,
            defaultNetwork: "testnet",
        },
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=network.js.map