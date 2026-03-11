import { CeloNetwork } from "../config/env";
export declare function buildWalletConfig(network: CeloNetwork): {
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
        }[];
    };
};
export declare function buildAllWalletConfigs(): {
    mainnet: {
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
            }[];
        };
    };
    testnet: {
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
            }[];
        };
    };
};
