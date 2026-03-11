import { Request, Response, NextFunction } from "express";
import { CeloNetwork } from "../config/env";
export interface AgentPaymentConfig {
    priceWei: bigint;
    token: "cUSD" | "USDC";
    recipient: `0x${string}`;
    network: CeloNetwork;
}
export declare function requirePayment(config: AgentPaymentConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function buildPaymentConfig(agentWalletAddress: `0x${string}`, network: CeloNetwork, priceUsd?: number, // default $0.01 per interaction
token?: "cUSD" | "USDC"): AgentPaymentConfig;
