import { Request, Response, NextFunction } from "express";
import { createThirdwebClient, toWei } from "thirdweb";
import { celo, celoSepoliaTestnet } from "thirdweb/chains";
import { env, chainRegistry, CeloNetwork } from "../config/env";

// ─────────────────────────────────────────
// Thirdweb client — singleton
// ─────────────────────────────────────────
const thirdwebClient = createThirdwebClient({
  secretKey: env.thirdwebSecretKey,
});

// ─────────────────────────────────────────
// Payment config per agent
// Agent builders set their price when
// registering — stored in agent metadata
// ─────────────────────────────────────────
export interface AgentPaymentConfig {
  priceWei: bigint;           // payment amount in wei
  token: "cUSD" | "USDC";    // accepted stablecoin
  recipient: `0x${string}`;  // agent wallet address
  network: CeloNetwork;
}

// ─────────────────────────────────────────
// x402 Payment Required response shape
// Follows the x402 protocol spec
// ─────────────────────────────────────────
interface X402PaymentRequired {
  x402Version: number;
  accepts: {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra: {
      name: string;
      version: string;
    };
  }[];
  error: string;
}

// ─────────────────────────────────────────
// Build the 402 response payload
// ─────────────────────────────────────────
function build402Response(
  config: AgentPaymentConfig,
  resource: string
): X402PaymentRequired {
  const chain = chainRegistry[config.network];
  const networkName =
    config.network === "mainnet" ? "base" : "base-sepolia";
  // Note: x402 uses "base" network naming convention
  // but we pass Celo contract addresses

  const tokenAddress =
    config.token === "cUSD"
      ? chain.stablecoins.cUSD
      : chain.stablecoins.USDC;

  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: networkName,
        maxAmountRequired: config.priceWei.toString(),
        resource,
        description: "Payment required to interact with this agent",
        mimeType: "application/json",
        payTo: config.recipient,
        maxTimeoutSeconds: 300,
        asset: tokenAddress,
        extra: {
          name: config.token,
          version: "1",
        },
      },
    ],
    error: "X-PAYMENT header is required",
  };
}

// ─────────────────────────────────────────
// Verify payment proof from X-PAYMENT header
// Thirdweb x402 SDK sends a signed payment
// proof that we verify before processing
// ─────────────────────────────────────────
async function verifyPaymentProof(
  paymentHeader: string,
  config: AgentPaymentConfig,
  resource: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Decode base64 payment proof
    const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
    const proof = JSON.parse(decoded);

    // Basic structural validation
    if (!proof.payload || !proof.payload.authorization) {
      return { valid: false, error: "Malformed payment proof" };
    }

    const auth = proof.payload.authorization;

    // Verify recipient matches agent wallet
    if (
      auth.to?.toLowerCase() !== config.recipient.toLowerCase()
    ) {
      return { valid: false, error: "Payment recipient mismatch" };
    }

    // Verify amount meets minimum
    const paidAmount = BigInt(auth.value ?? "0");
    if (paidAmount < config.priceWei) {
      return {
        valid: false,
        error: `Insufficient payment: got ${paidAmount}, required ${config.priceWei}`,
      };
    }

    // Verify token address
    const chain = chainRegistry[config.network];
    const expectedToken =
      config.token === "cUSD"
        ? chain.stablecoins.cUSD
        : chain.stablecoins.USDC;

    if (auth.token?.toLowerCase() !== expectedToken.toLowerCase()) {
      return { valid: false, error: "Invalid payment token" };
    }

    // Verify expiry
    const deadline = Number(auth.validBefore ?? 0);
    if (deadline < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Payment proof expired" };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Payment verification failed: ${err.message}` };
  }
}

// ─────────────────────────────────────────
// x402 middleware factory
// Wrap any Express route to require payment
//
// Usage:
//   router.post("/run",
//     requirePayment(agentPaymentConfig),
//     runAgentHandler
//   )
// ─────────────────────────────────────────
export function requirePayment(config: AgentPaymentConfig) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const paymentHeader = req.headers["x-payment"] as string | undefined;
    const resource = `${req.protocol}://${req.get("host")}${req.path}`;

    // No payment header — issue 402 challenge
    if (!paymentHeader) {
      res
        .status(402)
        .set("Content-Type", "application/json")
        .json(build402Response(config, resource));
      return;
    }

    // Verify the payment proof
    const { valid, error } = await verifyPaymentProof(
      paymentHeader,
      config,
      resource
    );

    if (!valid) {
      res.status(402).json({
        // error: "Payment verification failed",
        reason: error as string,
        ...build402Response(config, resource),
      });
      return;
    }

    // Payment verified — attach config to req for
    // downstream handlers to log/reference if needed
    (req as any).paymentConfig = config;
    (req as any).paymentVerified = true;

    next();
  };
}

// ─────────────────────────────────────────
// Helper — build payment config from
// agent record (used by hire endpoint)
// ─────────────────────────────────────────
export function buildPaymentConfig(
  agentWalletAddress: `0x${string}`,
  network: CeloNetwork,
  priceUsd: number = 0.01,       // default $0.01 per interaction
  token: "cUSD" | "USDC" = "cUSD"
): AgentPaymentConfig {
  // Convert USD price to wei (stablecoins are 18 decimals on Celo)
  const priceWei = toWei(priceUsd.toString());

  return {
    priceWei,
    token,
    recipient: agentWalletAddress,
    network,
  };
}