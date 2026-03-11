import { CeloNetwork } from "../config/env";
import { AgentFlag } from "../types/agent";
export declare function computeReputationScore(agentId: string, network: CeloNetwork): Promise<{
    score: number;
    flags: AgentFlag[];
    meta: {
        scan8004Score: number;
        totalFeedbacks: number;
        avgFeedbackScore: number;
        selfClawReputationScore: number;
        selfClawValidatedStakes: number;
        selfClawBadges: string[];
        selfClawSkillCount: number;
        selfClawSkillCategories: string[];
        supportedProtocols: string[];
        starCount: number;
    };
}>;
//# sourceMappingURL=reputation.d.ts.map