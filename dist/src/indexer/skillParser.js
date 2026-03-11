"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSkillMd = parseSkillMd;
exports.inferSkillsFromProtocols = inferSkillsFromProtocols;
exports.parseSelfClawSkills = parseSelfClawSkills;
exports.mergeSkillSources = mergeSkillSources;
exports.skillsToEmbeddingText = skillsToEmbeddingText;
const selfclaw_1 = require("../lib/selfclaw");
// ─────────────────────────────────────────
// Existing skill.md parser — unchanged
// ─────────────────────────────────────────
function parseSkillMd(raw) {
    if (!raw || raw.trim().length === 0)
        return [];
    const skills = [];
    const sections = raw.split(/^---$/m).filter((s) => s.trim());
    for (const section of sections) {
        try {
            const nameMatch = section.match(/^name:\s*(.+)$/m);
            const versionMatch = section.match(/^version:\s*(.+)$/m);
            const categoryMatch = section.match(/^category:\s*(.+)$/m);
            const descMatch = section.match(/^##\s*Description\s*\n([\s\S]*?)(?=^##|\z)/m);
            const inputsMatch = section.match(/^##\s*Inputs\s*\n([\s\S]*?)(?=^##|\z)/m);
            const outputsMatch = section.match(/^##\s*Outputs\s*\n([\s\S]*?)(?=^##|\z)/m);
            if (!nameMatch)
                continue;
            skills.push({
                name: nameMatch[1].trim(),
                description: descMatch?.[1]?.trim() ?? "",
                category: (categoryMatch?.[1]?.trim() ?? "other"),
                inputTypes: parseListSection(inputsMatch?.[1] ?? ""),
                outputTypes: parseListSection(outputsMatch?.[1] ?? ""),
                version: versionMatch?.[1]?.trim() ?? "1.0.0",
            });
        }
        catch {
            continue;
        }
    }
    return skills;
}
function parseListSection(raw) {
    return raw
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
}
// ─────────────────────────────────────────
// Protocol-to-capability inference
// Derives skill categories from declared
// protocols when skill.md is unavailable
// ─────────────────────────────────────────
const PROTOCOL_SKILL_MAP = {
    A2A: {
        name: "Agent-to-Agent Communication",
        description: "Supports A2A protocol — can receive tasks from and delegate to other agents in multi-agent pipelines.",
        category: "other",
    },
    MCP: {
        name: "Model Context Protocol Tools",
        description: "Exposes MCP-compatible tools callable by LLM runtimes and orchestrators.",
        category: "other",
    },
    Web: {
        name: "Web Service Integration",
        description: "HTTP-accessible agent that can interact with web services, APIs, and dApps.",
        category: "other",
    },
    Email: {
        name: "Email Automation",
        description: "Supports email-based communication and notification automation.",
        category: "payment-automation",
    },
    OASF: {
        name: "Open Agent Service Framework",
        description: "OASF-compatible agent exposing standardized service interfaces.",
        category: "other",
    },
};
function inferSkillsFromProtocols(protocols) {
    if (!protocols || protocols.length === 0)
        return [];
    return protocols
        .map((p) => {
        const mapped = PROTOCOL_SKILL_MAP[p.toUpperCase()];
        if (!mapped)
            return null;
        return {
            ...mapped,
            inputTypes: [],
            outputTypes: [],
            version: "inferred",
        };
    })
        .filter(Boolean);
}
// ─────────────────────────────────────────
// Convert SelfClaw marketplace skills
// to our AgentSkill format
// ─────────────────────────────────────────
function parseSelfClawSkills(selfClawSkills) {
    return selfClawSkills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        category: (0, selfclaw_1.mapSelfClawCategory)(skill.category),
        inputTypes: [],
        outputTypes: [],
        version: "selfclaw",
    }));
}
function mergeSkillSources(skillMdSkills, selfClawSkills, protocolSkills) {
    const seen = new Set();
    const merged = [];
    // skill.md — highest confidence
    for (const skill of skillMdSkills) {
        const key = skill.name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            merged.push({ ...skill, source: "skill.md", confidence: "high" });
        }
    }
    // SelfClaw skills — medium confidence
    // (agent published and priced them publicly)
    for (const skill of selfClawSkills) {
        const key = skill.name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            merged.push({ ...skill, source: "selfclaw", confidence: "medium" });
        }
    }
    // Protocol-inferred — low confidence
    for (const skill of protocolSkills) {
        const key = skill.name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            merged.push({ ...skill, source: "protocol", confidence: "low" });
        }
    }
    return merged;
}
function skillsToEmbeddingText(skills) {
    return skills
        .map((s) => `${s.name}: ${s.description} [category: ${s.category}]`)
        .join("\n");
}
//# sourceMappingURL=skillParser.js.map