/**
 * Skill Registry
 *
 * Central registry for all available skills. Skills are defined in code (not database)
 * for simplicity and type safety. A database-backed registry may be added later for
 * dynamic skill loading.
 */

import type { SkillDefinition, InputType, ArtifactType } from "./types";
import {
  transcriptionSkill,
  textEntrySkill,
  xrayAnalysisSkill,
  vbgAnalysisSkill,
  ecgAnalysisSkill,
} from "./definitions";

/**
 * All registered skills
 */
export const skillRegistry: Record<string, SkillDefinition> = {
  transcription: transcriptionSkill,
  text_entry: textEntrySkill,
  // Future skills (templates ready for implementation)
  xray_analysis: xrayAnalysisSkill,
  vbg_analysis: vbgAnalysisSkill,
  ecg_analysis: ecgAnalysisSkill,
};

/**
 * Skills that are currently active/implemented
 * Future skills are registered but not active until their edge functions exist
 */
export const ACTIVE_SKILL_IDS = ["transcription", "text_entry"] as const;
export type ActiveSkillId = (typeof ACTIVE_SKILL_IDS)[number];

/**
 * Get a skill definition by ID
 */
export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return skillRegistry[skillId];
}

/**
 * Get all skill definitions
 */
export function getAllSkills(): SkillDefinition[] {
  return Object.values(skillRegistry);
}

/**
 * Get only active (implemented) skills
 */
export function getActiveSkills(): SkillDefinition[] {
  return ACTIVE_SKILL_IDS.map((id) => skillRegistry[id]).filter(Boolean);
}

/**
 * Get skills that can process a specific input type
 */
export function getSkillsForInputType(inputType: InputType): SkillDefinition[] {
  return getAllSkills().filter((skill) => skill.inputTypes.includes(inputType));
}

/**
 * Get active skills that can process a specific input type
 */
export function getActiveSkillsForInputType(inputType: InputType): SkillDefinition[] {
  return getActiveSkills().filter((skill) => skill.inputTypes.includes(inputType));
}

/**
 * Get skills that can enrich a specific artifact type
 */
export function getSkillsThatCanEnrich(artifactType: ArtifactType): SkillDefinition[] {
  return getAllSkills().filter(
    (skill) => skill.canEnrichExisting && skill.enrichableArtifactTypes.includes(artifactType)
  );
}

/**
 * Check if a skill ID is valid
 */
export function isValidSkillId(skillId: string): skillId is string {
  return skillId in skillRegistry;
}

/**
 * Check if a skill ID is active/implemented
 */
export function isActiveSkillId(skillId: string): skillId is ActiveSkillId {
  return ACTIVE_SKILL_IDS.includes(skillId as ActiveSkillId);
}

/**
 * Get credit cost for a skill based on intent
 */
export function getSkillCreditCost(
  skillId: string,
  intent: "new_artifact" | "enrich_existing" | "instruction" | "question"
): number {
  const skill = getSkillDefinition(skillId);
  if (!skill) return 0;

  switch (intent) {
    case "new_artifact":
      return skill.creditCost;
    case "enrich_existing":
      return skill.enrichCost;
    case "instruction":
    case "question":
      return 0;
  }
}
