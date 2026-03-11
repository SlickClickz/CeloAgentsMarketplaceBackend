import { CeloNetwork } from "../config/env";
import { AgentFlag } from "../types/agent";
export declare function computeIdentityScore(agentId: string, network: CeloNetwork): Promise<{
    score: number;
    flags: AgentFlag[];
    meta: {
        selfClawVerified: boolean;
        selfClawVerificationLevel: string | null;
        registeredAt: string | null;
        ageDays: number;
        platformScore: number;
        starCount: number;
        supportedProtocols: string[];
        selfClawPipelineComplete: boolean;
    };
}>;
