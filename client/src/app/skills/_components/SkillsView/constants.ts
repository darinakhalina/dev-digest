export const VALID_TABS = ["config", "preview", "versions"] as const;
export type SkillTab = (typeof VALID_TABS)[number];
export const DEFAULT_TAB: SkillTab = "config";
