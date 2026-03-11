import { AgentMetadata } from "../types/agent";
import { CeloNetwork } from "../config/env";
export declare function indexAgentSkills(agent: AgentMetadata): Promise<void>;
export declare function reindexAgent(agent: AgentMetadata): Promise<void>;
export declare function syncScoreToIndex(agentId: string, network: CeloNetwork, camScore: number): Promise<void>;
//# sourceMappingURL=index.d.ts.map