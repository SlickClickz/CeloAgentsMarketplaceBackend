import { AgentSkill, AgentFlag, SkillCategory } from "../types/agent";
import { AgentScanActivity } from "../types/agentscan";
export declare function computeIntegrityScore(skills: AgentSkill[], activity: AgentScanActivity | null): {
    score: number;
    flags: AgentFlag[];
    meta: {
        declaredCategories: SkillCategory[];
        observedCategories: SkillCategory[];
        matchedCategories: SkillCategory[];
        unmatchedCategories: SkillCategory[];
    };
};
