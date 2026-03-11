"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillNetwork = backfillNetwork;
exports.startRegistryWatchers = startRegistryWatchers;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const env_1 = require("../config/env");
const queue_1 = require("./queue");
const AGENT_REGISTERED_EVENT = (0, viem_1.parseAbiItem)("event Registered(uint256 indexed agentId, string agentURI, address indexed owner)");
const celoSepolia = (0, viem_1.defineChain)({
    id: 11142220,
    name: "Celo Sepolia",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    rpcUrls: {
        default: {
            http: ["https://forno.celo-sepolia.celo-testnet.org"],
        },
    },
    blockExplorers: {
        default: {
            name: "Blockscout",
            url: "https://celo-sepolia.blockscout.com",
        },
    },
    testnet: true,
});
function buildClient(network) {
    const chain = network === "mainnet" ? chains_1.celo : celoSepolia;
    const config = env_1.chainRegistry[network];
    return (0, viem_1.createPublicClient)({
        chain,
        transport: (0, viem_1.http)(config.rpcUrl, {
            batch: true,
            retryCount: 3,
            retryDelay: 1000,
            timeout: 30_000,
        }),
    });
}
function parseLog(log, network) {
    try {
        const { args, blockNumber, transactionHash } = log;
        if (!args?.agentId || !args?.owner || !args?.agentURI)
            return null;
        return {
            agentId: args.agentId,
            owner: args.owner,
            tokenURI: args.agentURI,
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            network,
            timestamp: new Date(),
        };
    }
    catch {
        return null;
    }
}
// ─────────────────────────────────────────
// Manual getLogs polling loop
// Replaces watchContractEvent for mainnet
// No eth_newFilter — no dropped filters
// Polls every N seconds, tracks last block
// ─────────────────────────────────────────
function watchNetworkViaLogs(network) {
    const config = env_1.chainRegistry[network];
    const client = buildClient(network);
    const POLL_INTERVAL_MS = network === "mainnet" ? 8_000 : 4_000;
    const BLOCK_LAG = network === "mainnet" ? BigInt(2) : BigInt(1);
    let stopped = false;
    let lastBlock = null;
    console.log(`[Registry] Watching ${config.name} for Registered events (getLogs polling)`);
    console.log(`[Registry] Contract: ${config.identityRegistry}`);
    async function poll() {
        while (!stopped) {
            try {
                const latest = await client.getBlockNumber();
                // On first run start from a few blocks back
                // to catch anything during startup
                if (lastBlock === null) {
                    lastBlock = latest - BigInt(10);
                }
                // Don't query past the safe latest block
                // Use a small lag to avoid reorg issues
                const toBlock = latest - BLOCK_LAG;
                if (toBlock <= lastBlock) {
                    await sleep(POLL_INTERVAL_MS);
                    continue;
                }
                const logs = await client.getLogs({
                    address: config.identityRegistry,
                    event: AGENT_REGISTERED_EVENT,
                    fromBlock: lastBlock + BigInt(1),
                    toBlock,
                });
                if (logs.length > 0) {
                    console.log(`[Registry][${network}] Blocks ${lastBlock + BigInt(1)}-${toBlock}: ` +
                        `found ${logs.length} new agent(s)`);
                    for (const log of logs) {
                        const event = parseLog(log, network);
                        if (event) {
                            console.log(`[Registry][${network}] New agent: ${event.agentId} ` +
                                `(tx: ${event.transactionHash})`);
                            (0, queue_1.enqueue)(event);
                        }
                    }
                }
                lastBlock = toBlock;
            }
            catch (err) {
                // Log but don't crash — just wait and retry
                console.warn(`[Registry][${network}] Poll error: ${err.message} — retrying in ${POLL_INTERVAL_MS}ms`);
            }
            await sleep(POLL_INTERVAL_MS);
        }
    }
    // Start polling in background — don't await
    poll();
    // Return stop function
    return () => {
        stopped = true;
    };
}
// ─────────────────────────────────────────
// Backfill via raw getLogs — testnet only
// Mainnet backfill handled by subgraph
// ─────────────────────────────────────────
async function backfillNetwork(network, fromBlock) {
    if (network === "mainnet") {
        console.log(`[Registry] Mainnet backfill skipped — use subgraph instead`);
        return;
    }
    const config = env_1.chainRegistry[network];
    const client = buildClient(network);
    const CHUNK_SIZE = BigInt(500);
    const CHUNK_DELAY_MS = 200;
    const latestBlock = await client.getBlockNumber();
    console.log(`[Registry] Backfilling ${config.name} from block ${fromBlock} to ${latestBlock}...`);
    let totalFound = 0;
    let current = fromBlock;
    while (current <= latestBlock) {
        const toBlock = current + CHUNK_SIZE > latestBlock
            ? latestBlock
            : current + CHUNK_SIZE;
        try {
            const logs = await client.getLogs({
                address: config.identityRegistry,
                event: AGENT_REGISTERED_EVENT,
                fromBlock: current,
                toBlock,
            });
            if (logs.length > 0) {
                console.log(`[Registry] Blocks ${current}-${toBlock}: found ${logs.length} events`);
                for (const log of logs) {
                    const event = parseLog(log, network);
                    if (event) {
                        (0, queue_1.enqueue)(event);
                        totalFound++;
                    }
                }
            }
        }
        catch (err) {
            console.warn(`[Registry] Chunk ${current}-${toBlock} failed: ${err.message}, skipping...`);
            await sleep(CHUNK_DELAY_MS * 3);
            current = toBlock + BigInt(1);
            continue;
        }
        current = toBlock + BigInt(1);
        await sleep(CHUNK_DELAY_MS);
    }
    console.log(`[Registry] Backfill complete for ${network} — found ${totalFound} events`);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ─────────────────────────────────────────
// Start watchers for both networks
// Both use getLogs polling — no filters
// ─────────────────────────────────────────
function startRegistryWatchers() {
    const stopMainnet = watchNetworkViaLogs("mainnet");
    const stopTestnet = watchNetworkViaLogs("testnet");
    return () => {
        stopMainnet();
        stopTestnet();
        console.log("[Registry] Stopped all watchers");
    };
}
//# sourceMappingURL=registry.js.map