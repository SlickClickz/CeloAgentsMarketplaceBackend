export interface AgentScanActivity {
  agentId: string;
  totalTransactions: number;
  successRate: number;         // 0-1 (e.g. 0.97 = 97%)
  lastActiveTimestamp: string; // ISO string
  activityCategories: {
    category: string;
    count: number;
    lastSeen: string;
  }[];
  uptimePercent: number;       // 0-100
}

export interface AgentScanResponse {
  data: AgentScanActivity;
  status: "ok" | "not_found" | "error";
  message?: string;
}