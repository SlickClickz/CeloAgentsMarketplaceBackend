"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.chainRegistry = void 0;
exports.getChain = getChain;
exports.isValidNetwork = isValidNetwork;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    // RPC
    CELO_MAINNET_RPC_URL: zod_1.z.string().url().default(process.env.CELO_MAINNET_RPC_URL),
    CELO_TESTNET_RPC_URL: zod_1.z.string().url().default(process.env.CELO_TESTNET_RPC_URL),
    // Contracts
    IDENTITY_REGISTRY_MAINNET: zod_1.z.string().startsWith("0x"),
    IDENTITY_REGISTRY_TESTNET: zod_1.z.string().startsWith("0x"),
    // AgentScan
    AGENTSCAN_API_URL: zod_1.z.string().url(),
    AGENTSCAN_API_KEY: zod_1.z.string().min(1),
    // 8004scan
    SCAN_8004_API_KEY: zod_1.z.string().min(1),
    // OpenRouter
    OPENROUTER_API_KEY: zod_1.z.string().min(1),
    OPENROUTER_EMBEDDING_MODEL: zod_1.z.string().default("openai/text-embedding-3-small"),
    // ChromaDB
    CHROMA_HOST: zod_1.z.string().default("localhost"),
    CHROMA_PORT: zod_1.z.coerce.number().default(8000),
    // PostgreSQL
    DATABASE_URL: zod_1.z.string().url(),
    // Thirdweb
    THIRDWEB_CLIENT_ID: zod_1.z.string().min(1),
    THIRDWEB_SECRET_KEY: zod_1.z.string().min(1),
    // API
    PORT: zod_1.z.coerce.number().default(3000),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(60000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    // Default network if none specified in request
    DEFAULT_NETWORK: zod_1.z.enum(["mainnet", "testnet"]).default("testnet"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
const raw = parsed.data;
// ─────────────────────────────────────────
// Chain registry — both networks always
// available, no single "active" chain
// ─────────────────────────────────────────
exports.chainRegistry = {
    mainnet: {
        name: "Celo Mainnet",
        chainId: 42220,
        rpcUrl: raw.CELO_MAINNET_RPC_URL,
        identityRegistry: raw.IDENTITY_REGISTRY_MAINNET,
        chromaCollection: "cam_skills_mainnet",
        blockExplorer: "https://celoscan.io",
        nativeCurrency: {
            name: "Celo",
            symbol: "CELO",
            decimals: 18,
        },
        stablecoins: {
            cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
            USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        },
        isTestnet: false,
    },
    testnet: {
        name: "Celo Sepolia",
        chainId: 11142220,
        rpcUrl: raw.CELO_TESTNET_RPC_URL,
        identityRegistry: raw.IDENTITY_REGISTRY_TESTNET,
        chromaCollection: "cam_skills_testnet",
        blockExplorer: "https://celo-sepolia.blockscout.com",
        nativeCurrency: {
            name: "Celo",
            symbol: "CELO",
            decimals: 18,
        },
        stablecoins: {
            cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
            USDC: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
        },
        isTestnet: true,
    },
};
// ─────────────────────────────────────────
// Helper — resolves chain config from a
// network string, falls back to default.
// Use this everywhere instead of
// importing activeChain directly.
// ─────────────────────────────────────────
function getChain(network) {
    if (network === "mainnet" || network === "testnet") {
        return exports.chainRegistry[network];
    }
    return exports.chainRegistry[raw.DEFAULT_NETWORK];
}
function isValidNetwork(network) {
    return network === "mainnet" || network === "testnet";
}
// ─────────────────────────────────────────
// Flat env exports (chain-agnostic values)
// ─────────────────────────────────────────
exports.env = {
    defaultNetwork: raw.DEFAULT_NETWORK,
    // External APIs
    agentScanApiUrl: raw.AGENTSCAN_API_URL,
    agentScanApiKey: raw.AGENTSCAN_API_KEY,
    scan8004ApiKey: raw.SCAN_8004_API_KEY,
    // Add to your existing env object
    subgraphUrlMainnet: process.env.SUBGRAPH_URL_MAINNET,
    // OpenRouter
    openRouterApiKey: raw.OPENROUTER_API_KEY,
    openRouterEmbeddingModel: raw.OPENROUTER_EMBEDDING_MODEL,
    // ChromaDB
    chromaHost: raw.CHROMA_HOST,
    chromaPort: raw.CHROMA_PORT,
    // DB
    databaseUrl: raw.DATABASE_URL,
    // Thirdweb
    thirdwebClientId: raw.THIRDWEB_CLIENT_ID,
    thirdwebSecretKey: raw.THIRDWEB_SECRET_KEY,
    // API server
    port: parseInt(process.env.PORT ?? "3000", 10),
    rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: raw.RATE_LIMIT_MAX,
};
//# sourceMappingURL=env.js.map