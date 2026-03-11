export interface SelfClawAgentReputation {
    publicKey: string;
    agentName: string;
    totalStakes: number;
    validated: number;
    slashed: number;
    neutral: number;
    reputationScore: number;
    badges: string[];
}
export interface SelfClawAgentDetails {
    verified: boolean;
    publicKey: string;
    humanId: string;
    agentName: string;
    agentDescription: string;
    category: string;
    verifiedAt: string;
    walletAddress: string;
    walletChain: string;
    tokenAddress: string;
    erc8004TokenId: string;
    verificationLevel?: string;
    agentContext?: {
        identity: {
            name: string;
            description: string;
            category: string;
        };
        wallet: {
            address: string;
            chain: string;
        };
        services: SelfClawService[];
        revenue: {
            total: string;
            costs: string;
        };
    };
    pipeline?: {
        verified: boolean;
        walletCreated: boolean;
        tokenDeployed: boolean;
        erc8004Registered: boolean;
        sponsorshipReceived: boolean;
    };
}
export interface SelfClawService {
    id: string;
    name: string;
    description: string;
    price: string;
    currency: string;
    endpoint?: string;
    category?: string;
}
export interface SelfClawSkill {
    id: string;
    name: string;
    description: string;
    price: string;
    priceToken: string;
    category: string;
    agentPublicKey: string;
    avgRating: number;
    totalPurchases: number;
    active?: boolean;
    createdAt?: string;
}
export interface SelfClawScore {
    publicKey: string;
    agentName: string;
    score: number;
    grade: string;
    breakdown: {
        identity: {
            score: number;
            weight: number;
            weighted: number;
        };
        social: {
            score: number;
            weight: number;
            weighted: number;
        };
        economy: {
            score: number;
            weight: number;
            weighted: number;
        };
        skills: {
            score: number;
            weight: number;
            weighted: number;
        };
        reputation: {
            score: number;
            weight: number;
            weighted: number;
        };
    };
}
export declare function getSelfClawAgent(identifier: string): Promise<SelfClawAgentDetails | null>;
export declare function getSelfClawReputation(identifier: string): Promise<SelfClawAgentReputation | null>;
export declare function getSelfClawScore(publicKey: string): Promise<SelfClawScore | null>;
export declare function getSelfClawSkills(params?: {
    page?: number;
    limit?: number;
    category?: string;
}): Promise<SelfClawSkill[]>;
export declare function getAgentSelfClawSkills(publicKey: string): Promise<SelfClawSkill[]>;
export declare function getSelfClawAgentByWallet(walletAddress: string): Promise<SelfClawAgentDetails | null>;
export declare function getVerificationLevelScore(verificationLevel?: string): number;
export declare function mapSelfClawCategory(selfClawCategory: string): string;
export declare function pingSelfClaw(): Promise<boolean>;
