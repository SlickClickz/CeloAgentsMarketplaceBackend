import { CeloNetwork } from "../config/env";
export declare function upsertSkillVector(agentId: string, network: CeloNetwork, embedding: number[], metadata: {
    name: string;
    skills: string[];
    categories: string[];
    x402Endpoint: string | null;
    camScore: number;
}): Promise<void>;
export declare function querySkillVectors(network: CeloNetwork, queryEmbedding: number[], topN?: number, minScore?: number): Promise<{
    agentId: string;
    distance: number;
    metadata: {
        agentId: string;
        network: string;
        name: string;
        skills: string;
        categories: string;
        x402Endpoint: string;
        camScore: number;
    };
}[]>;
export declare function updateVectorScore(agentId: string, network: CeloNetwork, camScore: number): Promise<void>;
export declare function countIndexed(network: CeloNetwork): Promise<number>;
export declare function pingChroma(): Promise<boolean>;
//# sourceMappingURL=vector.d.ts.map