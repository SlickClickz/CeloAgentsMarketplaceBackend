import { ERC8004Metadata } from "../types/erc8004";
export declare function resolveTokenURI(agentURI: string): Promise<ERC8004Metadata>;
export declare function fetchSkillMd(skillMdUrl: string): Promise<string>;
export declare function extractX402Endpoint(metadata: ERC8004Metadata): string | null;
export declare function extractOASFSkills(metadata: ERC8004Metadata): string[];
export declare function extractProtocols(metadata: ERC8004Metadata): string[];
export declare function extractSkillMdUrl(metadata: ERC8004Metadata): string | null;
//# sourceMappingURL=metadata.d.ts.map