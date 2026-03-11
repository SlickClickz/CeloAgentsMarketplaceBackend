import { Request, Response, NextFunction } from "express";
import { CeloNetwork } from "../config/env";
export interface AgentPaymentConfig {
    priceUsd: number;
    token: "cUSD" | "USDC";
    recipient: string;
    network: CeloNetwork;
}
export declare function requirePayment(config: AgentPaymentConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function buildPaymentConfig(agentWalletAddress: string, network: CeloNetwork, priceUsd?: number, token?: "cUSD" | "USDC"): AgentPaymentConfig;
