"use strict";
// import { Request, Response, NextFunction } from "express";
// import { getChain, isValidNetwork, ChainConfig } from "../config/env";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNetwork = resolveNetwork;
const env_1 = require("../config/env");
function resolveNetwork(req, res, next) {
    const fromQuery = req.query.network;
    const fromHeader = req.headers["x-celo-network"];
    const raw = fromQuery ?? fromHeader;
    if (raw && !(0, env_1.isValidNetwork)(raw)) {
        res.status(400).json({
            error: "Invalid network parameter",
            message: `Expected "mainnet" or "testnet", received "${raw}"`,
            supportedNetworks: ["mainnet", "testnet"],
        });
        return;
    }
    req.chain = (0, env_1.getChain)(raw);
    // ← fixed: parentheses ensure ?? binds before ?:
    req.network = raw ?? (req.chain.isTestnet ? "testnet" : "mainnet");
    next();
}
//# sourceMappingURL=resolveNetwork.js.map