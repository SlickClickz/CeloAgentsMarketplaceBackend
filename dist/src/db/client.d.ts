import { PrismaClient } from "@prisma/client";
import { AgentMetadata, CAMScore } from "../types/agent";
import { CeloNetwork } from "../config/env";
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function withRetry<T>(fn: () => Promise<T>, retries?: number, delayMs?: number): Promise<T>;
export declare function upsertAgent(agent: AgentMetadata): Promise<void>;
export declare function upsertScore(score: CAMScore): Promise<void>;
export declare function getAgentById(agentId: string, network: CeloNetwork): Promise<AgentMetadata | null>;
export declare function getAllAgentIds(network: CeloNetwork): Promise<string[]>;
export declare function getAgentsWithScores(network: CeloNetwork, agentIds: string[], minScore?: number): Promise<any[]>;
export declare function getLastBlock(network: CeloNetwork): Promise<bigint>;
export declare function setLastBlock(network: CeloNetwork, blockNumber: bigint): Promise<void>;
export declare function pingDb(): Promise<boolean>;
//# sourceMappingURL=client.d.ts.map