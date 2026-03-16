"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTokenURI = resolveTokenURI;
exports.fetchSkillMd = fetchSkillMd;
exports.extractX402Endpoint = extractX402Endpoint;
exports.extractOASFSkills = extractOASFSkills;
exports.extractProtocols = extractProtocols;
exports.extractSkillMdUrl = extractSkillMdUrl;
const axios_1 = __importDefault(require("axios"));
const IPFS_GATEWAYS = [
    "https://cloudflare-ipfs.com/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://dweb.link/ipfs/",
];
// ─────────────────────────────────────────
// Resolve agentURI to metadata object
// ─────────────────────────────────────────
async function resolveTokenURI(agentURI) {
    if (agentURI.startsWith("data:application/json;base64,")) {
        const base64 = agentURI.replace("data:application/json;base64,", "");
        const json = Buffer.from(base64, "base64").toString("utf-8");
        const parsed = JSON.parse(json);
        validateMetadata(parsed);
        return parsed;
    }
    if (agentURI.startsWith("data:application/json,")) {
        const json = decodeURIComponent(agentURI.replace("data:application/json,", ""));
        const parsed = JSON.parse(json);
        validateMetadata(parsed);
        return parsed;
    }
    if (agentURI.startsWith("ipfs://")) {
        return fetchFromIPFS(agentURI);
    }
    try {
        const response = await axios_1.default.get(agentURI, {
            timeout: 10000,
        });
        validateMetadata(response.data);
        return response.data;
    }
    catch (err) {
        throw new Error(`Failed to resolve agentURI: ${agentURI} — ${err}`);
    }
}
async function fetchFromIPFS(uri) {
    const cid = uri.replace("ipfs://", "");
    for (const gateway of IPFS_GATEWAYS) {
        try {
            const response = await axios_1.default.get(`${gateway}${cid}`, { timeout: 10000 });
            validateMetadata(response.data);
            return response.data;
        }
        catch {
            continue;
        }
    }
    throw new Error(`Failed to fetch from IPFS: ${uri}`);
}
async function fetchSkillMd(skillMdUrl) {
    if (skillMdUrl.startsWith("data:text/markdown;base64,")) {
        const base64 = skillMdUrl.replace("data:text/markdown;base64,", "");
        return Buffer.from(base64, "base64").toString("utf-8");
    }
    if (skillMdUrl.startsWith("data:text/markdown,")) {
        return decodeURIComponent(skillMdUrl.replace("data:text/markdown,", ""));
    }
    if (skillMdUrl.startsWith("ipfs://")) {
        const cid = skillMdUrl.replace("ipfs://", "");
        for (const gateway of IPFS_GATEWAYS) {
            try {
                const response = await axios_1.default.get(`${gateway}${cid}`, { timeout: 10000, responseType: "text" });
                return response.data;
            }
            catch {
                continue;
            }
        }
        throw new Error(`Failed to fetch skill.md from IPFS: ${skillMdUrl}`);
    }
    const response = await axios_1.default.get(skillMdUrl, {
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
function extractX402Endpoint(metadata) {
    if (!metadata.services?.length)
        return null;
    // Look for explicit x402 service first
    const x402Service = metadata.services.find((s) => s.name?.toLowerCase() === "x402" ||
        s.name?.toLowerCase() === "x402support");
    if (x402Service?.endpoint)
        return x402Service.endpoint;
    // Fall back to web service — most agents use this
    const webService = metadata.services.find((s) => s.name?.toLowerCase() === "web");
    if (webService?.endpoint)
        return webService.endpoint;
    // Fall back to A2A service
    const a2aService = metadata.services.find((s) => s.name?.toLowerCase() === "a2a");
    if (a2aService?.endpoint)
        return a2aService.endpoint;
    // Last resort — first service with a non-IPFS HTTP endpoint
    const anyHttp = metadata.services.find((s) => s.endpoint &&
        (s.endpoint.startsWith("https://") ||
            s.endpoint.startsWith("http://")));
    if (anyHttp?.endpoint)
        return anyHttp.endpoint;
    return null;
}
// ─────────────────────────────────────────
// Extract OASF skills from services array
// The OASF service has an optional skills[]
// ─────────────────────────────────────────
function extractOASFSkills(metadata) {
    if (!metadata.services?.length)
        return [];
    const oasfService = metadata.services.find((s) => s.name?.toLowerCase() === "oasf");
    if (!oasfService?.skills?.length)
        return [];
    return oasfService.skills.filter((s) => typeof s === "string" && s.length > 0);
}
// ─────────────────────────────────────────
// Extract supported protocol names
// from services array
// ─────────────────────────────────────────
function extractProtocols(metadata) {
    if (!metadata.services?.length)
        return [];
    return metadata.services
        .map((s) => s.name)
        .filter((n) => typeof n === "string" && n.length > 0);
}
// ─────────────────────────────────────────
// Extract skill.md URL from metadata
// Checks common field names used in the wild
// ─────────────────────────────────────────
function extractSkillMdUrl(metadata) {
    // Direct field
    if (metadata.skillMd)
        return metadata.skillMd;
    if (metadata.skillMdUrl)
        return metadata.skillMdUrl;
    if (metadata.skill_md)
        return metadata.skill_md;
    // Check OASF service endpoint for skill.md
    const oasfService = metadata.services?.find((s) => s.name?.toLowerCase() === "oasf");
    if (oasfService?.endpoint && !oasfService.endpoint.startsWith("ipfs://")) {
        return null;
    }
    return null;
}
function validateMetadata(data) {
    if (typeof data !== "object" || data === null) {
        throw new Error("Metadata is not an object");
    }
    const meta = data;
    if (typeof meta.name !== "string") {
        throw new Error("Metadata missing required field: name");
    }
}
//# sourceMappingURL=metadata.js.map