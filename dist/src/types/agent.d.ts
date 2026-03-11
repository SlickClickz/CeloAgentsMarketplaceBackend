import { CeloNetwork, ChainConfig } from "../config/env";
import { ERC8004Metadata } from "./erc8004";
export type SkillCategory = "stablecoin-savings" | "yield-optimization" | "token-swap" | "cross-chain-transfer" | "payment-automation" | "data-oracle" | "nft-management" | "governance" | "other";
export interface AgentSkill {
    name: string;
    description: string;
    category: SkillCategory;
    inputTypes: string[];
    outputTypes: string[];
    version: string;
}
export interface AgentMetadata {
    agentId: string;
    walletAddress: `0x${string}`;
    tokenURI: string;
    name: string;
    description: string;
    skills: AgentSkill[];
    x402Endpoint: string | null;
    selfClawVerified: boolean;
    network: CeloNetwork;
    registrationTimestamp: Date;
    rawSkillMd?: string;
    rawSkillMdUrl?: string;
    rawMetadata?: ERC8004Metadata | null;
}
export interface CAMScoreBreakdown {
    identity: number;
    execution: number;
    skillIntegrity: number;
}
export interface CAMScore {
    agentId: string;
    network: CeloNetwork;
    total: number;
    breakdown: CAMScoreBreakdown;
    flags: AgentFlag[];
    lastUpdated: Date;
}
export type AgentFlagType = "SKILL_MISMATCH" | "INACTIVE" | "NEW_AGENT" | "UNVERIFIED";
export interface AgentFlag {
    type: AgentFlagType;
    message: string;
    severity: "info" | "warning" | "critical";
}
export interface AgentRecord extends AgentMetadata {
    camScore: CAMScore;
}
export interface DiscoveryResult {
    agentId: string;
    name: string;
    description: string;
    skills: AgentSkill[];
    camScore: number;
    breakdown: CAMScoreBreakdown;
    flags: AgentFlag[];
    x402Endpoint: string | null;
    network: CeloNetwork;
    chain: {
        chainId: number;
        name: string;
        blockExplorer: string;
        isTestnet: boolean;
        stablecoins: ChainConfig["stablecoins"];
    };
    lastActive: Date | null;
    registrationTimestamp: Date;
    blockExplorerUrl: string;
}
export interface NetworkMeta {
    network: CeloNetwork;
    chainId: number;
    chainName: string;
    isTestnet: boolean;
    blockExplorer: string;
}
export interface CAMApiResponse<T> {
    data: T;
    meta: NetworkMeta;
    timestamp: string;
}
//# sourceMappingURL=agent.d.ts.map