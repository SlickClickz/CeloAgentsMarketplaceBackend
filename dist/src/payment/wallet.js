"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThirdwebClient = getThirdwebClient;
exports.getThirdwebChain = getThirdwebChain;
exports.buildWalletConfig = buildWalletConfig;
exports.buildAllWalletConfigs = buildAllWalletConfigs;
const thirdweb_1 = require("thirdweb");
const chains_1 = require("thirdweb/chains");
const env_1 = require("../config/env");
// ─────────────────────────────────────────
// Singleton Thirdweb client
// ─────────────────────────────────────────
let client = null;
function getThirdwebClient() {
    if (!client) {
        client = (0, thirdweb_1.createThirdwebClient)({
            secretKey: env_1.env.thirdwebSecretKey,
        });
    }
    return client;
}
// ─────────────────────────────────────────
// Resolve Thirdweb chain object from
// our CeloNetwork type
// ─────────────────────────────────────────
function getThirdwebChain(network) {
    return network === "mainnet" ? chains_1.celo : chains_1.celoSepoliaTestnet;
}
// ─────────────────────────────────────────
// Build client-side wallet config
// Returned to the frontend via the
// /api/v1/networks endpoint so the
// Thirdweb Wallet SDK can be initialized
// with the correct chain + client ID
// without hardcoding on the client
// ─────────────────────────────────────────
function buildWalletConfig(network) {
    const chain = env_1.chainRegistry[network];
    const thirdwebChain = getThirdwebChain(network);
    return {
        clientId: env_1.env.thirdwebClientId,
        chain: {
            id: chain.chainId,
            name: chain.name,
            rpc: chain.rpcUrl,
            nativeCurrency: chain.nativeCurrency,
            blockExplorers: [
                {
                    name: "Celoscan",
                    url: chain.blockExplorer,
                },
            ],
        },
        supportedTokens: {
            [chain.chainId]: [
                {
                    address: chain.stablecoins.cUSD,
                    name: "Celo Dollar",
                    symbol: "cUSD",
                    decimals: 18,
                    icon: "https://celo.org/images/token-cUSD.png",
                },
                {
                    address: chain.stablecoins.USDC,
                    name: "USD Coin",
                    symbol: "USDC",
                    decimals: 6,
                    icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
                },
            ],
        },
    };
}
// ─────────────────────────────────────────
// Build wallet configs for both networks
// Sent to frontend on initial load so it
// can switch chains without hitting the
// server again
// ─────────────────────────────────────────
function buildAllWalletConfigs() {
    return {
        mainnet: buildWalletConfig("mainnet"),
        testnet: buildWalletConfig("testnet"),
    };
}
//# sourceMappingURL=wallet.js.map