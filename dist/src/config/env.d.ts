export type CeloNetwork = "mainnet" | "testnet";
export interface ChainConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    identityRegistry: `0x${string}`;
    chromaCollection: string;
    blockExplorer: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    stablecoins: {
        cUSD: `0x${string}`;
        USDC: `0x${string}`;
    };
    isTestnet: boolean;
}
export declare const chainRegistry: Record<CeloNetwork, ChainConfig>;
export declare function getChain(network?: string): ChainConfig;
export declare function isValidNetwork(network: string): network is CeloNetwork;
export declare const env: {
    defaultNetwork: "mainnet" | "testnet";
    agentScanApiUrl: string;
    agentScanApiKey: string;
    scan8004ApiKey: string;
    subgraphUrlMainnet: string;
    openRouterApiKey: string;
    openRouterEmbeddingModel: string;
    chromaHost: string;
    chromaPort: number;
    databaseUrl: string;
    thirdwebClientId: string;
    thirdwebSecretKey: string;
    port: number;
    rateLimitWindowMs: number;
    rateLimitMax: number;
};
//# sourceMappingURL=env.d.ts.map