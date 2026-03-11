export interface AgentScanActivity {
    agentId: string;
    totalTransactions: number;
    successRate: number;
    lastActiveTimestamp: string;
    activityCategories: {
        category: string;
        count: number;
        lastSeen: string;
    }[];
    uptimePercent: number;
}
export interface AgentScanResponse {
    data: AgentScanActivity;
    status: "ok" | "not_found" | "error";
    message?: string;
}
//# sourceMappingURL=agentscan.d.ts.map