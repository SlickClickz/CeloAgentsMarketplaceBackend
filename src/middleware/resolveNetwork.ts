// import { Request, Response, NextFunction } from "express";
// import { getChain, isValidNetwork, ChainConfig } from "../config/env";

// // Extend Express Request type to carry chain config
// declare global {
//   namespace Express {
//     interface Request {
//       chain: ChainConfig;
//       network: "mainnet" | "testnet";
//     }
//   }
// }

// // ─────────────────────────────────────────
// // Network resolution order:
// // 1. ?network= query param  (per-request, from frontend toggle)
// // 2. X-Celo-Network header  (for programmatic API consumers)
// // 3. DEFAULT_NETWORK env var (server fallback)
// // ─────────────────────────────────────────
// export function resolveNetwork(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): void {
//   const fromQuery = req.query.network as string | undefined;
//   const fromHeader = req.headers["x-celo-network"] as string | undefined;
//   const raw = fromQuery ?? fromHeader;

//   if (raw && !isValidNetwork(raw)) {
//     res.status(400).json({
//       error: "Invalid network parameter",
//       message: `Expected "mainnet" or "testnet", received "${raw}"`,
//       supportedNetworks: ["mainnet", "testnet"],
//     });
//     return;
//   }

//   req.chain = getChain(raw);
//   req.network = (raw as "mainnet" | "testnet") ?? req.chain.isTestnet ? "testnet" : "mainnet";
//   next();
// }

import { Request, Response, NextFunction } from "express";
import { getChain, isValidNetwork, ChainConfig } from "../config/env";

declare global {
  namespace Express {
    interface Request {
      chain: ChainConfig;
      network: "mainnet" | "testnet";
    }
  }
}

export function resolveNetwork(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const fromQuery = req.query.network as string | undefined;
  const fromHeader = req.headers["x-celo-network"] as string | undefined;
  const raw = fromQuery ?? fromHeader;

  if (raw && !isValidNetwork(raw)) {
    res.status(400).json({
      error: "Invalid network parameter",
      message: `Expected "mainnet" or "testnet", received "${raw}"`,
      supportedNetworks: ["mainnet", "testnet"],
    });
    return;
  }

  req.chain = getChain(raw);
  // ← fixed: parentheses ensure ?? binds before ?:
  req.network = (raw as "mainnet" | "testnet") ?? (req.chain.isTestnet ? "testnet" : "mainnet");
  next();
}