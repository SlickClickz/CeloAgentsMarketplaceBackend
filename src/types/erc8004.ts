import { CeloNetwork } from "../config/env";

export interface ERC8004RegisteredEvent {
  agentId: bigint;
  owner: `0x${string}`;
  tokenURI: string;       // maps from agentURI in the contract event
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  network: CeloNetwork;
  timestamp: Date;
}

// ─────────────────────────────────────────
// EIP-8004 registration metadata schema
// Based on actual on-chain data:
// {
//   "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
//   "name": "Echo Quasar",
//   "description": "...",
//   ...
// }
// ─────────────────────────────────────────
export interface ERC8004Metadata {
  type?: string;           // EIP-8004 type URI
  name: string;
  description?: string;
  image?: string;
  skillMdUrl?: string;     // optional — not all agents have skill.md
  x402Endpoint?: string;
  selfClawProof?: string;
  version?: string;
  // EIP-8004 may also carry these fields directly
  skills?: any[];
  endpoints?: {
    x402?: string;
    [key: string]: string | undefined;
  };
}

// ─────────────────────────────────────────
// 8004scan API response shapes
// ─────────────────────────────────────────
export interface Scan8004Agent {
  id: string;
  agent_id: string;
  token_id: number;
  chain_id: number;
  name: string;
  description: string;
  image_url: string;
  owner_address: string;
  supported_protocols: string[];
  total_score: number;
  star_count: number;
  total_feedbacks: number;
  created_at: string;
}

export interface Scan8004ResponseMeta {
  version: string;
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface Scan8004AgentResponse {
  success: boolean;
  data: Scan8004Agent;
  meta: Scan8004ResponseMeta;
}

export interface Scan8004AgentListResponse {
  success: boolean;
  data: Scan8004Agent[];
  meta: Scan8004ResponseMeta;
}

export interface Scan8004StatsResponse {
  success: boolean;
  data: {
    total_agents: number;
    total_users: number;
    total_feedbacks: number;
    total_validations: number;
  };
  meta: Scan8004ResponseMeta;
}

export interface Scan8004Chain {
  chain_id: number;
  name: string;
  is_testnet: boolean;
  explorer_url: string;
}

export interface Scan8004ChainsResponse {
  success: boolean;
  data: Scan8004Chain[];
  meta: Scan8004ResponseMeta;
}

export interface ERC8004Service {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface ERC8004Metadata {
  type?: string;
  name: string;
  description?: string;
  image?: string;
  services?: ERC8004Service[];
  x402Support?: boolean;
  active?: boolean;
  registrations?: {
    agentId: number;
    agentRegistry: string;
  }[];
  supportedTrust?: string[];
  // Legacy fields — some agents use these
  skillMd?: string;
  skillMdUrl?: string;
  skill_md?: string;
}

export interface ERC8004RegisteredEvent {
  agentId: bigint;
  owner: `0x${string}`;
  tokenURI: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  network: import("../config/env").CeloNetwork;
  timestamp: Date;
}