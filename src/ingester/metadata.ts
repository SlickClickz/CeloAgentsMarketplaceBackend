// import axios from "axios";
// import { ERC8004Metadata } from "../types/erc8004";

// const IPFS_GATEWAYS = [
//   "https://cloudflare-ipfs.com/ipfs/",
//   "https://ipfs.io/ipfs/",
//   "https://dweb.link/ipfs/",
// ];

// // ─────────────────────────────────────────
// // Resolve agentURI to metadata object
// // Handles three formats:
// // 1. data:application/json;base64,... (inline)
// // 2. ipfs://... (IPFS)
// // 3. https://... (HTTP)
// // ─────────────────────────────────────────
// export async function resolveTokenURI(
//   agentURI: string
// ): Promise<ERC8004Metadata> {
//   // Format 1 — inline base64 JSON data URI
//   if (agentURI.startsWith("data:application/json;base64,")) {
//     const base64 = agentURI.replace("data:application/json;base64,", "");
//     const json = Buffer.from(base64, "base64").toString("utf-8");
//     const parsed = JSON.parse(json);
//     validateMetadata(parsed);
//     return parsed as ERC8004Metadata;
//   }

//   // Format 2 — plain JSON data URI (not base64)
//   if (agentURI.startsWith("data:application/json,")) {
//     const json = decodeURIComponent(
//       agentURI.replace("data:application/json,", "")
//     );
//     const parsed = JSON.parse(json);
//     validateMetadata(parsed);
//     return parsed as ERC8004Metadata;
//   }

//   // Format 3 — IPFS URI
//   if (agentURI.startsWith("ipfs://")) {
//     return fetchFromIPFS(agentURI);
//   }

//   // Format 4 — HTTPS URI
//   try {
//     const response = await axios.get<ERC8004Metadata>(agentURI, {
//       timeout: 10000,
//     });
//     validateMetadata(response.data);
//     return response.data;
//   } catch (err) {
//     throw new Error(`Failed to resolve agentURI: ${agentURI} — ${err}`);
//   }
// }

// async function fetchFromIPFS(uri: string): Promise<ERC8004Metadata> {
//   const cid = uri.replace("ipfs://", "");

//   for (const gateway of IPFS_GATEWAYS) {
//     try {
//       const response = await axios.get<ERC8004Metadata>(
//         `${gateway}${cid}`,
//         { timeout: 10000 }
//       );
//       validateMetadata(response.data);
//       return response.data;
//     } catch {
//       continue;
//     }
//   }

//   throw new Error(`Failed to fetch from IPFS: ${uri}`);
// }

// // ─────────────────────────────────────────
// // Fetch skill.md content
// // Also handles base64 data URIs for skill.md
// // ─────────────────────────────────────────
// export async function fetchSkillMd(skillMdUrl: string): Promise<string> {
//   // Inline skill.md as base64
//   if (skillMdUrl.startsWith("data:text/markdown;base64,")) {
//     const base64 = skillMdUrl.replace("data:text/markdown;base64,", "");
//     return Buffer.from(base64, "base64").toString("utf-8");
//   }

//   // Inline skill.md as plain text
//   if (skillMdUrl.startsWith("data:text/markdown,")) {
//     return decodeURIComponent(
//       skillMdUrl.replace("data:text/markdown,", "")
//     );
//   }

//   // IPFS
//   if (skillMdUrl.startsWith("ipfs://")) {
//     const cid = skillMdUrl.replace("ipfs://", "");
//     for (const gateway of IPFS_GATEWAYS) {
//       try {
//         const response = await axios.get<string>(
//           `${gateway}${cid}`,
//           { timeout: 10000, responseType: "text" }
//         );
//         return response.data;
//       } catch {
//         continue;
//       }
//     }
//     throw new Error(`Failed to fetch skill.md from IPFS: ${skillMdUrl}`);
//   }

//   // HTTPS
//   const response = await axios.get<string>(skillMdUrl, {
//     timeout: 10000,
//     responseType: "text",
//   });
//   return response.data;
// }

// function validateMetadata(data: unknown): void {
//   if (typeof data !== "object" || data === null) {
//     throw new Error("Metadata is not an object");
//   }
//   const meta = data as Record<string, unknown>;
//   if (typeof meta.name !== "string") {
//     throw new Error("Metadata missing required field: name");
//   }
// }

import axios from "axios";
import { ERC8004Metadata, ERC8004Service } from "../types/erc8004";

const IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];

// ─────────────────────────────────────────
// Resolve agentURI to metadata object
// ─────────────────────────────────────────
export async function resolveTokenURI(
  agentURI: string
): Promise<ERC8004Metadata> {
  if (agentURI.startsWith("data:application/json;base64,")) {
    const base64 = agentURI.replace("data:application/json;base64,", "");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    validateMetadata(parsed);
    return parsed as ERC8004Metadata;
  }

  if (agentURI.startsWith("data:application/json,")) {
    const json = decodeURIComponent(
      agentURI.replace("data:application/json,", "")
    );
    const parsed = JSON.parse(json);
    validateMetadata(parsed);
    return parsed as ERC8004Metadata;
  }

  if (agentURI.startsWith("ipfs://")) {
    return fetchFromIPFS(agentURI);
  }

  try {
    const response = await axios.get<ERC8004Metadata>(agentURI, {
      timeout: 10000,
    });
    validateMetadata(response.data);
    return response.data;
  } catch (err) {
    throw new Error(`Failed to resolve agentURI: ${agentURI} — ${err}`);
  }
}

async function fetchFromIPFS(uri: string): Promise<ERC8004Metadata> {
  const cid = uri.replace("ipfs://", "");
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await axios.get<ERC8004Metadata>(
        `${gateway}${cid}`,
        { timeout: 10000 }
      );
      validateMetadata(response.data);
      return response.data;
    } catch {
      continue;
    }
  }
  throw new Error(`Failed to fetch from IPFS: ${uri}`);
}

export async function fetchSkillMd(skillMdUrl: string): Promise<string> {
  if (skillMdUrl.startsWith("data:text/markdown;base64,")) {
    const base64 = skillMdUrl.replace("data:text/markdown;base64,", "");
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  if (skillMdUrl.startsWith("data:text/markdown,")) {
    return decodeURIComponent(
      skillMdUrl.replace("data:text/markdown,", "")
    );
  }

  if (skillMdUrl.startsWith("ipfs://")) {
    const cid = skillMdUrl.replace("ipfs://", "");
    for (const gateway of IPFS_GATEWAYS) {
      try {
        const response = await axios.get<string>(
          `${gateway}${cid}`,
          { timeout: 10000, responseType: "text" }
        );
        return response.data;
      } catch {
        continue;
      }
    }
    throw new Error(`Failed to fetch skill.md from IPFS: ${skillMdUrl}`);
  }

  const response = await axios.get<string>(skillMdUrl, {
    timeout: 10000,
    responseType: "text",
  });
  return response.data;
}

// ─────────────────────────────────────────
// Extract x402 endpoint from metadata
// Priority:
// 1. x402Support service endpoint
// 2. web service endpoint (most common)
// 3. First available service endpoint
// ─────────────────────────────────────────
export function extractX402Endpoint(
  metadata: ERC8004Metadata
): string | null {
  if (!metadata.services?.length) return null;

  // Look for explicit x402 service first
  const x402Service = metadata.services.find(
    (s) =>
      s.name?.toLowerCase() === "x402" ||
      s.name?.toLowerCase() === "x402support"
  );
  if (x402Service?.endpoint) return x402Service.endpoint;

  // Fall back to web service — most agents use this
  const webService = metadata.services.find(
    (s) => s.name?.toLowerCase() === "web"
  );
  if (webService?.endpoint) return webService.endpoint;

  // Fall back to A2A service
  const a2aService = metadata.services.find(
    (s) => s.name?.toLowerCase() === "a2a"
  );
  if (a2aService?.endpoint) return a2aService.endpoint;

  // Last resort — first service with a non-IPFS HTTP endpoint
  const anyHttp = metadata.services.find(
    (s) =>
      s.endpoint &&
      (s.endpoint.startsWith("https://") ||
        s.endpoint.startsWith("http://"))
  );
  if (anyHttp?.endpoint) return anyHttp.endpoint;

  return null;
}

// ─────────────────────────────────────────
// Extract OASF skills from services array
// The OASF service has an optional skills[]
// ─────────────────────────────────────────
export function extractOASFSkills(
  metadata: ERC8004Metadata
): string[] {
  if (!metadata.services?.length) return [];

  const oasfService = metadata.services.find(
    (s) => s.name?.toLowerCase() === "oasf"
  );

  if (!oasfService?.skills?.length) return [];

  return oasfService.skills.filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
}

// ─────────────────────────────────────────
// Extract supported protocol names
// from services array
// ─────────────────────────────────────────
export function extractProtocols(metadata: ERC8004Metadata): string[] {
  if (!metadata.services?.length) return [];
  return metadata.services
    .map((s) => s.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
}

// ─────────────────────────────────────────
// Extract skill.md URL from metadata
// Checks common field names used in the wild
// ─────────────────────────────────────────
export function extractSkillMdUrl(
  metadata: ERC8004Metadata
): string | null {
  // Direct field
  if (metadata.skillMd) return metadata.skillMd;
  if (metadata.skillMdUrl) return metadata.skillMdUrl;
  if (metadata.skill_md) return metadata.skill_md;

  // Check OASF service endpoint for skill.md
  const oasfService = metadata.services?.find(
    (s) => s.name?.toLowerCase() === "oasf"
  );
  if (oasfService?.endpoint && !oasfService.endpoint.startsWith("ipfs://")) {
    return null;
  }

  return null;
}

function validateMetadata(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("Metadata is not an object");
  }
  const meta = data as Record<string, unknown>;
  if (typeof meta.name !== "string") {
    throw new Error("Metadata missing required field: name");
  }
}