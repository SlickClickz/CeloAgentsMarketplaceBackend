import { CeloNetwork } from "../config/env";
import { Scan8004Agent, Scan8004StatsResponse, Scan8004ChainsResponse } from "../types/erc8004";
export declare function getAgent(tokenId: number | string, network: CeloNetwork): Promise<Scan8004Agent | null>;
export declare function listAgents(params: {
    network: CeloNetwork;
    page?: number;
    limit?: number;
    ownerAddress?: string;
    search?: string;
    sortBy?: "created_at" | "stars" | "name" | "token_id" | "total_score";
    sortOrder?: "asc" | "desc";
}): Promise<{
    agents: Scan8004Agent[];
    hasMore: boolean;
    total: number;
}>;
export declare function searchAgents(params: {
    query: string;
    network: CeloNetwork;
    limit?: number;
    semanticWeight?: number;
}): Promise<Scan8004Agent[]>;
export declare function getAgentsByOwner(ownerAddress: string, network: CeloNetwork, page?: number, limit?: number): Promise<Scan8004Agent[]>;
export declare function getPlatformStats(): Promise<Scan8004StatsResponse["data"] | null>;
export declare function getSupportedChains(): Promise<Scan8004ChainsResponse["data"]>;
export declare function listFeedbacks(params: {
    network: CeloNetwork;
    tokenId: number;
    limit?: number;
    minScore?: number;
}): Promise<{
    score: number;
    comment: string;
    created_at: string;
}[]>;
