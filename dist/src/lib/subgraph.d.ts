export interface SubgraphAgent {
    id: string;
    agentId: string;
    owner: string;
    agentWallet: string | null;
    agentURI: string;
    registeredAt: string;
    registeredBlock: string;
    transactionHash: string;
    uriHistory: {
        uri: string;
        updatedAt: string;
        updatedBlock: string;
    }[];
    metadata: {
        metadataKey: string;
        metadataValueString: string;
    }[];
}
export declare function getSubgraphMeta(): Promise<{
    blockNumber: number;
    hasIndexingErrors: boolean;
    synced: boolean;
} | null>;
export declare function getSubgraphStats(): Promise<{
    totalAgents: number;
} | null>;
export declare function getAllAgentsFromSubgraph(fromBlock?: number): Promise<SubgraphAgent[]>;
export declare function getAgentFromSubgraph(agentId: string): Promise<SubgraphAgent | null>;
export declare function getAgentsSinceBlock(fromBlock: number): Promise<SubgraphAgent[]>;
//# sourceMappingURL=subgraph.d.ts.map