"use strict";
// import axios from "axios";
// import { CeloNetwork, env } from "../config/env";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubgraphMeta = getSubgraphMeta;
exports.getSubgraphStats = getSubgraphStats;
exports.getAllAgentsFromSubgraph = getAllAgentsFromSubgraph;
exports.getAgentFromSubgraph = getAgentFromSubgraph;
exports.getAgentsSinceBlock = getAgentsSinceBlock;
// // ─────────────────────────────────────────
// // Subgraph client for mainnet only
// // Testnet falls back to viem + 8004scan
// // ─────────────────────────────────────────
// const SUBGRAPH_URL = env.subgraphUrlMainnet;
// const PAGE_SIZE = 1000; // max per query
// export interface SubgraphAgent {
//   id: string;
//   agentId: string;
//   owner: string;
//   agentWallet: string | null;
//   agentURI: string;
//   registeredAt: string;
//   registeredBlock: string;
//   transactionHash: string;
//   uriHistory: {
//     uri: string;
//     updatedAt: string;
//     updatedBlock: string;
//   }[];
//   metadata: {
//     metadataKey: string;
//     metadataValueString: string;
//   }[];
// }
// interface SubgraphResponse<T> {
//   data?: T;
//   errors?: { message: string }[];
// }
// // ─────────────────────────────────────────
// // Check if subgraph is ready and synced
// // ─────────────────────────────────────────
// export async function getSubgraphMeta(): Promise<{
//   blockNumber: number;
//   hasIndexingErrors: boolean;
//   synced: boolean;
// } | null> {
//   try {
//     const res = await axios.post
//       <SubgraphResponse<{
//         _meta: {
//           block: { number: number };
//           hasIndexingErrors: boolean;
//           deployment: string;
//         };
//       }>
//     >(SUBGRAPH_URL, {
//       query: `{
//         _meta {
//           block { number }
//           hasIndexingErrors
//           deployment
//         }
//       }`,
//     });
//     const meta = res.data?.data?._meta;
//     if (!meta) return null;
//     return {
//       blockNumber: meta.block.number,
//       hasIndexingErrors: meta.hasIndexingErrors,
//       // Consider synced if within 100 blocks of latest
//       // We update this dynamically once we know latest block
//       synced: !meta.hasIndexingErrors,
//     };
//   } catch (err: any) {
//     console.warn(`[Subgraph] getMeta failed: ${err.message}`);
//     return null;
//   }
// }
// // ─────────────────────────────────────────
// // Get total agent count from subgraph
// // ─────────────────────────────────────────
// export async function getSubgraphStats(): Promise<{
//   totalAgents: number;
// } | null> {
//   try {
//     const res = await axios.post
//       <SubgraphResponse<{
//         registryStats: { totalAgents: string } | null;
//       }>
//     >(SUBGRAPH_URL, {
//       query: `{
//         registryStats(id: "global") {
//           totalAgents
//         }
//       }`,
//     });
//     const stats = res.data?.data?.registryStats;
//     if (!stats) return null;
//     return {
//       totalAgents: parseInt(stats.totalAgents),
//     };
//   } catch (err: any) {
//     console.warn(`[Subgraph] getStats failed: ${err.message}`);
//     return null;
//   }
// }
// // ─────────────────────────────────────────
// // Paginated fetch of all agents
// // Uses cursor-based pagination via lastId
// // to reliably get all agents
// // ─────────────────────────────────────────
// export async function getAllAgentsFromSubgraph(
//   fromBlock?: number
// ): Promise<SubgraphAgent[]> {
//   const allAgents: SubgraphAgent[] = [];
//   let lastId = "";
//   let hasMore = true;
//   const blockFilter = fromBlock
//     ? `, where: { registeredBlock_gte: "${fromBlock}", id_gt: "${lastId}" }`
//     : `, where: { id_gt: "${lastId}" }`;
//   console.log(
//     `[Subgraph] Fetching all agents from mainnet subgraph...`
//   );
//   while (hasMore) {
//     try {
//       const whereClause = fromBlock
//         ? `where: { registeredBlock_gte: "${fromBlock}", id_gt: "${lastId}" }`
//         : `where: { id_gt: "${lastId}" }`;
//       const res = await axios.post
//         <SubgraphResponse<{ agents: SubgraphAgent[] }>
//       >(SUBGRAPH_URL, {
//         query: `{
//           agents(
//             first: ${PAGE_SIZE}
//             orderBy: id
//             orderDirection: asc
//             ${whereClause}
//           ) {
//             id
//             agentId
//             owner
//             agentWallet
//             agentURI
//             registeredAt
//             registeredBlock
//             transactionHash
//             metadata {
//               metadataKey
//               metadataValueString
//             }
//             uriHistory(orderBy: updatedBlock, orderDirection: desc, first: 1) {
//               uri
//               updatedAt
//               updatedBlock
//             }
//           }
//         }`,
//       });
//       if (res.data?.errors?.length) {
//         console.error(
//           `[Subgraph] Query errors: ${res.data.errors
//             .map((e) => e.message)
//             .join(", ")}`
//         );
//         break;
//       }
//       const agents = res.data?.data?.agents ?? [];
//       if (agents.length === 0) {
//         hasMore = false;
//         break;
//       }
//       allAgents.push(...agents);
//       lastId = agents[agents.length - 1].id;
//       hasMore = agents.length === PAGE_SIZE;
//       console.log(
//         `[Subgraph] Fetched ${allAgents.length} agents so far...`
//       );
//       // Small delay to be a good citizen
//       if (hasMore) await sleep(200);
//     } catch (err: any) {
//       console.error(`[Subgraph] Pagination failed: ${err.message}`);
//       break;
//     }
//   }
//   console.log(
//     `[Subgraph] Total agents fetched: ${allAgents.length}`
//   );
//   return allAgents;
// }
// // ─────────────────────────────────────────
// // Get a single agent by agentId
// // ─────────────────────────────────────────
// export async function getAgentFromSubgraph(
//   agentId: string
// ): Promise<SubgraphAgent | null> {
//   try {
//     const res = await axios.post
//       <SubgraphResponse<{ agent: SubgraphAgent | null }>
//     >(SUBGRAPH_URL, {
//       query: `{
//         agent(id: "${agentId}") {
//           id
//           agentId
//           owner
//           agentWallet
//           agentURI
//           registeredAt
//           registeredBlock
//           transactionHash
//           metadata {
//             metadataKey
//             metadataValueString
//           }
//           uriHistory(orderBy: updatedBlock, orderDirection: desc, first: 1) {
//             uri
//             updatedAt
//             updatedBlock
//           }
//         }
//       }`,
//     });
//     return res.data?.data?.agent ?? null;
//   } catch (err: any) {
//     console.warn(
//       `[Subgraph] getAgent failed for ${agentId}: ${err.message}`
//     );
//     return null;
//   }
// }
// // ─────────────────────────────────────────
// // Get agents registered after a block
// // Used by the ingester to catch up
// // after a restart
// // ─────────────────────────────────────────
// export async function getAgentsSinceBlock(
//   fromBlock: number
// ): Promise<SubgraphAgent[]> {
//   return getAllAgentsFromSubgraph(fromBlock);
// }
// function sleep(ms: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const SUBGRAPH_URL = env_1.env.subgraphUrlMainnet;
const PAGE_SIZE = 1000;
// ─────────────────────────────────────────
// Debug — log URL on startup so we can
// verify it's set correctly
// ─────────────────────────────────────────
if (!SUBGRAPH_URL) {
    console.error("[Subgraph] ❌ SUBGRAPH_URL_MAINNET is not set in environment — " +
        "mainnet backfill will not work");
}
else {
    console.log(`[Subgraph] Endpoint: ${SUBGRAPH_URL}`);
}
async function getSubgraphMeta() {
    if (!SUBGRAPH_URL)
        return null;
    try {
        const res = await axios_1.default.post(SUBGRAPH_URL, {
            query: `{
        _meta {
          block { number }
          hasIndexingErrors
          deployment
        }
      }`,
        });
        if (res.data?.errors?.length) {
            console.error(`[Subgraph] getMeta errors: ${res.data.errors.map((e) => e.message).join(", ")}`);
            return null;
        }
        const meta = res.data?.data?._meta;
        if (!meta) {
            console.warn("[Subgraph] getMeta returned no data");
            return null;
        }
        return {
            blockNumber: meta.block.number,
            hasIndexingErrors: meta.hasIndexingErrors,
            synced: !meta.hasIndexingErrors,
        };
    }
    catch (err) {
        console.error(`[Subgraph] getMeta failed: ${err.message}`, err.response?.data ?? "");
        return null;
    }
}
async function getSubgraphStats() {
    if (!SUBGRAPH_URL)
        return null;
    try {
        const res = await axios_1.default.post(SUBGRAPH_URL, {
            query: `{
        registryStats(id: "global") {
          totalAgents
        }
      }`,
        });
        if (res.data?.errors?.length) {
            console.error(`[Subgraph] getStats errors: ${res.data.errors.map((e) => e.message).join(", ")}`);
            return null;
        }
        const stats = res.data?.data?.registryStats;
        if (!stats) {
            console.warn("[Subgraph] registryStats(global) returned null — entity may not exist yet");
            return null;
        }
        return { totalAgents: parseInt(stats.totalAgents) };
    }
    catch (err) {
        console.error(`[Subgraph] getStats failed: ${err.message}`, err.response?.data ?? "");
        return null;
    }
}
async function getAllAgentsFromSubgraph(fromBlock) {
    if (!SUBGRAPH_URL) {
        console.error("[Subgraph] Cannot fetch agents — SUBGRAPH_URL_MAINNET not set");
        return [];
    }
    const allAgents = [];
    let lastId = "";
    let hasMore = true;
    console.log(`[Subgraph] Fetching all agents from: ${SUBGRAPH_URL}`);
    while (hasMore) {
        try {
            const whereClause = fromBlock
                ? `where: { registeredBlock_gte: "${fromBlock}", id_gt: "${lastId}" }`
                : `where: { id_gt: "${lastId}" }`;
            const query = `{
        agents(
          first: ${PAGE_SIZE}
          orderBy: id
          orderDirection: asc
          ${whereClause}
        ) {
          id
          agentId
          owner
          agentWallet
          agentURI
          registeredAt
          registeredBlock
          transactionHash
          metadata {
            metadataKey
            metadataValueString
          }
          uriHistory(orderBy: updatedBlock, orderDirection: desc, first: 1) {
            uri
            updatedAt
            updatedBlock
          }
        }
      }`;
            const res = await axios_1.default.post(SUBGRAPH_URL, { query }, {
                timeout: 30000,
                headers: { "Content-Type": "application/json" },
            });
            // Log full response on first page for debugging
            if (lastId === "") {
                console.log(`[Subgraph] Response status: ${res.status}, ` +
                    `has data: ${!!res.data?.data}, ` +
                    `errors: ${JSON.stringify(res.data?.errors ?? [])}`);
            }
            if (res.data?.errors?.length) {
                console.error(`[Subgraph] Query errors: ${res.data.errors
                    .map((e) => e.message)
                    .join(", ")}`);
                break;
            }
            const agents = res.data?.data?.agents ?? [];
            console.log(`[Subgraph] Page returned ${agents.length} agents ` +
                `(lastId: "${lastId}")`);
            if (agents.length === 0) {
                hasMore = false;
                break;
            }
            allAgents.push(...agents);
            lastId = agents[agents.length - 1].id;
            hasMore = agents.length === PAGE_SIZE;
            console.log(`[Subgraph] Fetched ${allAgents.length} agents so far...`);
            if (hasMore)
                await sleep(200);
        }
        catch (err) {
            console.error(`[Subgraph] Pagination failed: ${err.message}`, err.response?.status ?? "", JSON.stringify(err.response?.data ?? ""));
            break;
        }
    }
    console.log(`[Subgraph] Total agents fetched: ${allAgents.length}`);
    return allAgents;
}
async function getAgentFromSubgraph(agentId) {
    if (!SUBGRAPH_URL)
        return null;
    try {
        const res = await axios_1.default.post(SUBGRAPH_URL, {
            query: `{
        agent(id: "${agentId}") {
          id
          agentId
          owner
          agentWallet
          agentURI
          registeredAt
          registeredBlock
          transactionHash
          metadata {
            metadataKey
            metadataValueString
          }
          uriHistory(orderBy: updatedBlock, orderDirection: desc, first: 1) {
            uri
            updatedAt
            updatedBlock
          }
        }
      }`,
        });
        if (res.data?.errors?.length) {
            console.error(`[Subgraph] getAgent errors: ${res.data.errors.map((e) => e.message).join(", ")}`);
            return null;
        }
        return res.data?.data?.agent ?? null;
    }
    catch (err) {
        console.error(`[Subgraph] getAgent failed for ${agentId}: ${err.message}`, err.response?.data ?? "");
        return null;
    }
}
async function getAgentsSinceBlock(fromBlock) {
    return getAllAgentsFromSubgraph(fromBlock);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=subgraph.js.map