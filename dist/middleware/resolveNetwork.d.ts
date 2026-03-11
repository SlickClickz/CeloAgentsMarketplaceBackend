import { Request, Response, NextFunction } from "express";
import { ChainConfig } from "../config/env";
declare global {
    namespace Express {
        interface Request {
            chain: ChainConfig;
            network: "mainnet" | "testnet";
        }
    }
}
export declare function resolveNetwork(req: Request, res: Response, next: NextFunction): void;
