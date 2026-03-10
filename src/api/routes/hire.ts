import { Router, Request, Response, NextFunction } from "express";
import { requirePayment, buildPaymentConfig } from "../../payment/x402";
import { getAgentById } from "../../db/client";
import axios from "axios";

const router = Router();

// ─────────────────────────────────────────
// POST /api/v1/hire/:agentId
// Initiates a paid interaction with an agent
//
// Flow:
// 1. Lookup agent record
// 2. x402 middleware challenges for payment
// 3. On verified payment, proxy the request
//    to the agent's x402Endpoint
// ─────────────────────────────────────────
router.post(
  "/:agentId",
  // Dynamic middleware — resolve agent first,
  // then apply payment requirement
  async (req: Request, res: Response, next: NextFunction) => {
    const { agentId } = req.params;
    const { network, chain } = req;

    try {
      const agent = await getAgentById(agentId, network);

      if (!agent) {
        res.status(404).json({
          error: {
            code: "AGENT_NOT_FOUND",
            message: `Agent ${agentId} not found on ${network}`,
          },
        });
        return;
      }

      if (!agent.x402Endpoint) {
        res.status(400).json({
          error: {
            code: "NO_PAYMENT_ENDPOINT",
            message: `Agent ${agentId} has no x402 endpoint configured`,
          },
        });
        return;
      }

      // Attach agent to req for the payment middleware
      (req as any).resolvedAgent = agent;

      // Build payment config from agent wallet + network
      const paymentConfig = buildPaymentConfig(
        agent.walletAddress,
        network,
        0.01,  // $0.01 default — agents can override via metadata
        "cUSD"
      );

      // Apply x402 payment check inline
      requirePayment(paymentConfig)(req, res, async () => {
        // Payment verified — proxy to agent endpoint
        try {
          const agentResponse = await axios.post(
            agent.x402Endpoint!,
            req.body,
            {
              headers: {
                "Content-Type": "application/json",
                "X-CAM-Agent-Id": agentId,
                "X-CAM-Network": network,
                "X-CAM-Chain-Id": chain.chainId.toString(),
                // Forward payment proof to agent
                "X-Payment": req.headers["x-payment"] as string,
              },
              timeout: 30000,
            }
          );

          res.status(agentResponse.status).json({
            data: agentResponse.data,
            meta: {
              agentId,
              network,
              chainId: chain.chainId,
              paymentVerified: true,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (proxyErr: any) {
          if (axios.isAxiosError(proxyErr)) {
            res.status(proxyErr.response?.status ?? 502).json({
              error: {
                code: "AGENT_PROXY_ERROR",
                message: "Agent endpoint returned an error",
                details: proxyErr.response?.data,
              },
            });
            return;
          }
          next(proxyErr);
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;