import { AgentSkill } from "../types/agent";
import { SelfClawSkill } from "../lib/selfclaw";
export declare function parseSkillMd(raw: string): AgentSkill[];
export declare function inferSkillsFromProtocols(protocols: string[]): AgentSkill[];
export declare function parseSelfClawSkills(selfClawSkills: SelfClawSkill[]): AgentSkill[];
export type SkillSource = "skill.md" | "selfclaw" | "protocol";
export interface EnrichedSkill extends AgentSkill {
    source: SkillSource;
    confidence: "high" | "medium" | "low";
}
export declare function mergeSkillSources(skillMdSkills: AgentSkill[], selfClawSkills: AgentSkill[], protocolSkills: AgentSkill[]): EnrichedSkill[];
export declare function skillsToEmbeddingText(skills: AgentSkill[]): string;
//# sourceMappingURL=skillParser.d.ts.map