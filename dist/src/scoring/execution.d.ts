import { CeloNetwork } from "../config/env";
import { AgentFlag } from "../types/agent";
import { AgentScanActivity } from "../types/agentscan";
export declare function fetchExecutionData(agentId: string, network: CeloNetwork): Promise<AgentScanActivity | null>;
export declare function computeExecutionScore(agentId: string, network: CeloNetwork): Promise<{
    score: number;
    flags: AgentFlag[];
    meta: {
        totalTransactions: number;
        successRate: number;
        lastActiveTimestamp: string | null;
        activityCategories: AgentScanActivity["activityCategories"];
    };
}>;
//# sourceMappingURL=execution.d.ts.map