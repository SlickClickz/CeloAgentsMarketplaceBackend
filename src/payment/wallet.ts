import { createThirdwebClient } from "thirdweb";
import { celo, celoSepoliaTestnet } from "thirdweb/chains";
import { env, CeloNetwork, chainRegistry } from "../config/env";

// ─────────────────────────────────────────
// Singleton Thirdweb client
// ─────────────────────────────────────────
let client: ReturnType<typeof createThirdwebClient> | null = null;

export function getThirdwebClient() {
  if (!client) {
    client = createThirdwebClient({
      secretKey: env.thirdwebSecretKey,
    });
  }
  return client;
}

// ─────────────────────────────────────────
// Resolve Thirdweb chain object from
// our CeloNetwork type
// ─────────────────────────────────────────
export function getThirdwebChain(network: CeloNetwork) {
  return network === "mainnet" ? celo : celoSepoliaTestnet;
}

// ─────────────────────────────────────────
// Build client-side wallet config
// Returned to the frontend via the
// /api/v1/networks endpoint so the
// Thirdweb Wallet SDK can be initialized
// with the correct chain + client ID
// without hardcoding on the client
// ─────────────────────────────────────────
export function buildWalletConfig(network: CeloNetwork) {
  const chain = chainRegistry[network];
  const thirdwebChain = getThirdwebChain(network);

  return {
    clientId: env.thirdwebClientId,
    chain: {
      id: chain.chainId,
      name: chain.name,
      rpc: chain.rpcUrl,
      nativeCurrency: chain.nativeCurrency,
      blockExplorers: [
        {
          name: "Celoscan",
          url: chain.blockExplorer,
        },
      ],
    },
    supportedTokens: {
      [chain.chainId]: [
        {
          address: chain.stablecoins.cUSD,
          name: "Celo Dollar",
          symbol: "cUSD",
          decimals: 18,
          icon: "https://celo.org/images/token-cUSD.png",
        },
        {
          address: chain.stablecoins.USDC,
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        },
      ],
    },
  };
}

// ─────────────────────────────────────────
// Build wallet configs for both networks
// Sent to frontend on initial load so it
// can switch chains without hitting the
// server again
// ─────────────────────────────────────────
export function buildAllWalletConfigs() {
  return {
    mainnet: buildWalletConfig("mainnet"),
    testnet: buildWalletConfig("testnet"),
  };
}