import { CeloNetwork } from "../config/env";
export declare function getThirdwebClient(): import("thirdweb").ThirdwebClient;
export declare function getThirdwebChain(network: CeloNetwork): Readonly<import("thirdweb/chains").ChainOptions & {
    rpc: string;
}>;
export declare function buildWalletConfig(network: CeloNetwork): {
    clientId: string;
    chain: {
        id: number;
        name: string;
        rpc: string;
        nativeCurrency: {
            name: string;
            symbol: string;
            decimals: number;
        };
        blockExplorers: {
            name: string;
            url: string;
        }[];
    };
    supportedTokens: {
        [x: number]: {
            address: `0x${string}`;
            name: string;
            symbol: string;
            decimals: number;
            icon: string;
        }[];
    };
};
export declare function buildAllWalletConfigs(): {
    mainnet: {
        clientId: string;
        chain: {
            id: number;
            name: string;
            rpc: string;
            nativeCurrency: {
                name: string;
                symbol: string;
                decimals: number;
            };
            blockExplorers: {
                name: string;
                url: string;
            }[];
        };
        supportedTokens: {
            [x: number]: {
                address: `0x${string}`;
                name: string;
                symbol: string;
                decimals: number;
                icon: string;
            }[];
        };
    };
    testnet: {
        clientId: string;
        chain: {
            id: number;
            name: string;
            rpc: string;
            nativeCurrency: {
                name: string;
                symbol: string;
                decimals: number;
            };
            blockExplorers: {
                name: string;
                url: string;
            }[];
        };
        supportedTokens: {
            [x: number]: {
                address: `0x${string}`;
                name: string;
                symbol: string;
                decimals: number;
                icon: string;
            }[];
        };
    };
};
//# sourceMappingURL=wallet.d.ts.map