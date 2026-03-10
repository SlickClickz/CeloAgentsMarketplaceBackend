// import {
//   Registered,
//   MetadataSet,
//   URIUpdated,
//   Transfer,
//   SetAgentWalletCall,
// } from "../generated/IdentityRegistry/IdentityRegistry";
// import { IdentityRegistry } from "../generated/IdentityRegistry/IdentityRegistry";
// import {
//   Agent,
//   AgentMetadata,
//   AgentURIHistory,
//   RegistryStats,
// } from "../generated/schema";
// import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";

// // ─────────────────────────────────────────
// // Helper — get or create global stats
// // ─────────────────────────────────────────
// function getOrCreateStats(
//   timestamp: BigInt,
//   blockNumber: BigInt
// ): RegistryStats {
//   let stats = RegistryStats.load("global");
//   if (!stats) {
//     stats = new RegistryStats("global");
//     stats.totalAgents = BigInt.fromI32(0);
//   }
//   stats.lastUpdatedAt = timestamp;
//   stats.lastUpdatedBlock = blockNumber;
//   return stats;
// }

// // ─────────────────────────────────────────
// // Handle: Registered
// // Emitted when a new agent is minted
// // ─────────────────────────────────────────
// export function handleRegistered(event: Registered): void {
//   const agentId = event.params.agentId.toString();

//   let agent = Agent.load(agentId);
//   if (!agent) {
//     agent = new Agent(agentId);
//     agent.transferCount = 0;
//     agent.uriUpdateCount = 0;
//   }

//   agent.agentId = event.params.agentId;
//   agent.owner = event.params.owner;
//   agent.agentURI = event.params.agentURI;
//   agent.registeredAt = event.block.timestamp;
//   agent.registeredBlock = event.block.number;
//   agent.transactionHash = event.transaction.hash;

//   // Try to get agentWallet from contract at registration time
//   const contract = IdentityRegistry.bind(event.address);
//   const walletResult = contract.try_getAgentWallet(event.params.agentId);
//   if (!walletResult.reverted) {
//     const zeroAddress = Address.fromString(
//       "0x0000000000000000000000000000000000000000"
//     );
//     if (walletResult.value != zeroAddress) {
//       agent.agentWallet = walletResult.value;
//     }
//   }

//   agent.save();

//   // Record initial URI in history
//   const historyId = agentId + "-" + event.block.number.toString();
//   const history = new AgentURIHistory(historyId);
//   history.agent = agentId;
//   history.uri = event.params.agentURI;
//   history.updatedAt = event.block.timestamp;
//   history.updatedBlock = event.block.number;
//   history.updatedBy = event.params.owner;
//   history.transactionHash = event.transaction.hash;
//   history.save();

//   // Update global stats
//   const stats = getOrCreateStats(
//     event.block.timestamp,
//     event.block.number
//   );
//   stats.totalAgents = stats.totalAgents.plus(BigInt.fromI32(1));
//   stats.save();
// }

// // ─────────────────────────────────────────
// // Handle: MetadataSet
// // Emitted when agent metadata is written
// // e.g. agentWallet, description, skills
// // ─────────────────────────────────────────
// export function handleMetadataSet(event: MetadataSet): void {
//   const agentId = event.params.agentId.toString();
//   const agent = Agent.load(agentId);
//   if (!agent) return;

//   const metadataKey = event.params.metadataKey;
//   const metadataId = agentId + "-" + metadataKey;

//   let metadata = AgentMetadata.load(metadataId);
//   if (!metadata) {
//     metadata = new AgentMetadata(metadataId);
//     metadata.agent = agentId;
//     metadata.metadataKey = metadataKey;
//   }

//   metadata.metadataValue = event.params.metadataValue;
//   metadata.metadataValueString = event.params.metadataValue.toHexString();
//   metadata.updatedAt = event.block.timestamp;
//   metadata.updatedBlock = event.block.number;
//   metadata.transactionHash = event.transaction.hash;
//   metadata.save();

//   // If this is the agentWallet key, update agent directly
//   // so it's easily queryable without joining metadata
//   if (metadataKey == "agentWallet") {
//     // metadataValue is the wallet address as bytes
//     if (event.params.metadataValue.length >= 20) {
//       agent.agentWallet = event.params.metadataValue;
//       agent.save();
//     }
//   }

//   // Update stats timestamp
//   const stats = getOrCreateStats(
//     event.block.timestamp,
//     event.block.number
//   );
//   stats.save();
// }

// // ─────────────────────────────────────────
// // Handle: URIUpdated
// // Emitted when agent updates their URI
// // Track full history for re-indexing
// // ─────────────────────────────────────────
// export function handleURIUpdated(event: URIUpdated): void {
//   const agentId = event.params.agentId.toString();
//   const agent = Agent.load(agentId);
//   if (!agent) return;

//   // Update current URI on agent
//   agent.agentURI = event.params.newURI;
//   agent.uriUpdateCount = agent.uriUpdateCount + 1;
//   agent.save();

//   // Record in history — useful for CAM to detect
//   // when skill.md has been updated and re-index
//   const historyId =
//     agentId + "-" + event.block.number.toString() + "-update";
//   const history = new AgentURIHistory(historyId);
//   history.agent = agentId;
//   history.uri = event.params.newURI;
//   history.updatedAt = event.block.timestamp;
//   history.updatedBlock = event.block.number;
//   history.updatedBy = event.params.updatedBy;
//   history.transactionHash = event.transaction.hash;
//   history.save();
// }

// // ─────────────────────────────────────────
// // Handle: Transfer
// // Tracks ownership changes
// // Also handles mint (from = zero address)
// // ─────────────────────────────────────────
// export function handleTransfer(event: Transfer): void {
//   const agentId = event.params.tokenId.toString();
//   const agent = Agent.load(agentId);
//   if (!agent) return;

//   const zeroAddress = Address.fromString(
//     "0x0000000000000000000000000000000000000000"
//   );

//   // Skip mint events — handled by handleRegistered
//   if (event.params.from == zeroAddress) return;

//   agent.owner = event.params.to;
//   agent.transferCount = agent.transferCount + 1;
//   agent.save();
// }

// // ─────────────────────────────────────────
// // Handle: setAgentWallet call
// // Updates agent wallet address directly
// // ─────────────────────────────────────────
// export function handleSetAgentWallet(call: SetAgentWalletCall): void {
//   const agentId = call.inputs.agentId.toString();
//   const agent = Agent.load(agentId);
//   if (!agent) return;

//   agent.agentWallet = call.inputs.newWallet;
//   agent.save();
// }

import {
  Registered,
  MetadataSet,
  URIUpdated,
  Transfer,
} from "../generated/IdentityRegistry/IdentityRegistry";
import { IdentityRegistry } from "../generated/IdentityRegistry/IdentityRegistry";
import {
  Agent,
  AgentMetadata,
  AgentURIHistory,
  RegistryStats,
} from "../generated/schema";
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";

// ─────────────────────────────────────────
// Helper — get or create global stats
// ─────────────────────────────────────────
function getOrCreateStats(
  timestamp: BigInt,
  blockNumber: BigInt
): RegistryStats {
  let stats = RegistryStats.load("global");
  if (!stats) {
    stats = new RegistryStats("global");
    stats.totalAgents = BigInt.fromI32(0);
  }
  stats.lastUpdatedAt = timestamp;
  stats.lastUpdatedBlock = blockNumber;
  return stats;
}

// ─────────────────────────────────────────
// Handle: Registered
// ─────────────────────────────────────────
export function handleRegistered(event: Registered): void {
  const agentId = event.params.agentId.toString();

  let agent = Agent.load(agentId);
  if (!agent) {
    agent = new Agent(agentId);
    agent.transferCount = 0;
    agent.uriUpdateCount = 0;
  }

  agent.agentId = event.params.agentId;
  agent.owner = event.params.owner;
  agent.agentURI = event.params.agentURI;
  agent.registeredAt = event.block.timestamp;
  agent.registeredBlock = event.block.number;
  agent.transactionHash = event.transaction.hash;

  // Try to get agentWallet from contract at registration time
  const contract = IdentityRegistry.bind(event.address);
  const walletResult = contract.try_getAgentWallet(event.params.agentId);
  if (!walletResult.reverted) {
    const zeroAddress = Address.fromString(
      "0x0000000000000000000000000000000000000000"
    );
    if (walletResult.value != zeroAddress) {
      agent.agentWallet = walletResult.value;
    }
  }

  agent.save();

  // Record initial URI in history
  const historyId = agentId + "-" + event.block.number.toString();
  const history = new AgentURIHistory(historyId);
  history.agent = agentId;
  history.uri = event.params.agentURI;
  history.updatedAt = event.block.timestamp;
  history.updatedBlock = event.block.number;
  history.updatedBy = event.params.owner;
  history.transactionHash = event.transaction.hash;
  history.save();

  // Update global stats
  const stats = getOrCreateStats(
    event.block.timestamp,
    event.block.number
  );
  stats.totalAgents = stats.totalAgents.plus(BigInt.fromI32(1));
  stats.save();
}

// ─────────────────────────────────────────
// Handle: MetadataSet
// ─────────────────────────────────────────
export function handleMetadataSet(event: MetadataSet): void {
  const agentId = event.params.agentId.toString();
  const agent = Agent.load(agentId);
  if (!agent) return;

  const metadataKey = event.params.metadataKey;
  const metadataId = agentId + "-" + metadataKey;

  let metadata = AgentMetadata.load(metadataId);
  if (!metadata) {
    metadata = new AgentMetadata(metadataId);
    metadata.agent = agentId;
    metadata.metadataKey = metadataKey;
  }

  metadata.metadataValue = event.params.metadataValue;
  metadata.metadataValueString = event.params.metadataValue.toHexString();
  metadata.updatedAt = event.block.timestamp;
  metadata.updatedBlock = event.block.number;
  metadata.transactionHash = event.transaction.hash;
  metadata.save();

  // If agentWallet key — update agent directly
  if (metadataKey == "agentWallet") {
    if (event.params.metadataValue.length >= 20) {
      agent.agentWallet = event.params.metadataValue;
      agent.save();
    }
  }

  const stats = getOrCreateStats(
    event.block.timestamp,
    event.block.number
  );
  stats.save();
}

// ─────────────────────────────────────────
// Handle: URIUpdated
// ─────────────────────────────────────────
export function handleURIUpdated(event: URIUpdated): void {
  const agentId = event.params.agentId.toString();
  const agent = Agent.load(agentId);
  if (!agent) return;

  agent.agentURI = event.params.newURI;
  agent.uriUpdateCount = agent.uriUpdateCount + 1;
  agent.save();

  const historyId =
    agentId + "-" + event.block.number.toString() + "-update";
  const history = new AgentURIHistory(historyId);
  history.agent = agentId;
  history.uri = event.params.newURI;
  history.updatedAt = event.block.timestamp;
  history.updatedBlock = event.block.number;
  history.updatedBy = event.params.updatedBy;
  history.transactionHash = event.transaction.hash;
  history.save();
}

// ─────────────────────────────────────────
// Handle: Transfer
// ─────────────────────────────────────────
export function handleTransfer(event: Transfer): void {
  const agentId = event.params.tokenId.toString();
  const agent = Agent.load(agentId);
  if (!agent) return;

  const zeroAddress = Address.fromString(
    "0x0000000000000000000000000000000000000000"
  );

  // Skip mint events — handled by handleRegistered
  if (event.params.from == zeroAddress) return;

  agent.owner = event.params.to;
  agent.transferCount = agent.transferCount + 1;
  agent.save();
}