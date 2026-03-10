import { Router, Request, Response } from "express";
import { chainRegistry } from "../../config/env";
import { buildAllWalletConfigs } from "../../payment/wallet";

const router = Router();

// ─────────────────────────────────────────
// GET /api/v1/networks
// Returns all supported networks, chain
// configs, and Thirdweb wallet configs
// ─────────────────────────────────────────
router.get("/", (_req: Request, res: Response) => {
  const networks = Object.entries(chainRegistry).map(([key, config]) => ({
    network: key,
    chainId: config.chainId,
    name: config.name,
    rpcUrl: config.rpcUrl,
    blockExplorer: config.blockExplorer,
    isTestnet: config.isTestnet,
    stablecoins: config.stablecoins,
    nativeCurrency: config.nativeCurrency,
  }));

  const walletConfigs = buildAllWalletConfigs();

  res.json({
    data: {
      networks,
      walletConfigs,
      defaultNetwork: "testnet",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;