import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { SYSTEM_INSTRUCTION_BASE } from './data/system_instruction_base';
import { SYSTEM_INSTRUCTION_MAPS } from './data/system_instruction_maps';
import { SYSTEM_INSTRUCTION_STORYBOARD } from './data/system_instruction_storyboard';
import { BattleIdentification, BattlePlan, Faction, GeneratedAsset, MapAsset, StoryboardFrame } from './interfaces';
import { base_schema } from './schema/base_schema';
import { maps_schema } from './schema/maps_schema';
import { storyboard_schema } from './schema/storyboard_schema';

const API_BASE_URL = 'http://localhost:3001';
const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

/**
 * Generates a new image from a text prompt.
 * @param prompt The text prompt to send to the image generation API.
 * @param caption The caption to associate with the generated asset.
 * @returns A promise that resolves to a `GeneratedAsset` object.
 */
export const executeImageGeneration = async (prompt: string, caption: string): Promise<GeneratedAsset> => {
  const imageResponse = await fetch(`${API_BASE_URL}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!imageResponse.ok) {
    const errorBody = await imageResponse.text();
    throw new Error(`Failed to generate image asset (${caption}): ${errorBody}`);
  }
  const { base64, mimeType } = await imageResponse.json();
  return {
    url: `data:${mimeType};base64,${base64}`,
    base64, mimeType, caption
  };
};

/**
 * Edits an existing image based on a text prompt and an optional style reference.
 * This is used for all layered image composition steps.
 * @param currentImage The base image to be edited.
 * @param prompt The text prompt describing the edit.
 * @param caption The caption for the resulting asset.
 * @param styleReference An optional image to use as a style guide.
 * @returns A promise that resolves to the new, edited `GeneratedAsset`.
 */
export const executeImageEdit = async (currentImage: GeneratedAsset, prompt: string, caption: string, styleReference?: GeneratedAsset): Promise<GeneratedAsset> => {
  const body: {
    base64: string;
    mimeType: string;
    prompt: string;
    style_reference_base64?: string;
  } = {
    base64: currentImage.base64,
    mimeType: currentImage.mimeType,
    prompt,
  };
  if (styleReference) {
    body.style_reference_base64 = styleReference.base64;
  }
  const editResponse = await fetch(`${API_BASE_URL}/api/generate-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!editResponse.ok) {
    const errorBody = await editResponse.text();
    throw new Error(`Failed to generate frame step (${caption}): ${errorBody}`);
  }
  const { base64, mimeType } = await editResponse.json();
  return {
    base64, mimeType, url: `data:${mimeType};base64,${base64}`,
    caption
  };
};

/**
 * A generic function to call the planning API for a specific part of the battle plan.
 * This allows for a modular approach where different instructions and schemas can be used
 * for different parts of the generation process.
 * @param inputText The original user-provided text.
 * @param instruction The specific system instruction for this planning step.
 * @param schema The JSON schema the AI's response must conform to.
 * @param addLog A callback function for logging progress.
 * @param context Optional additional context to prepend to the system instruction.
 * @returns A promise that resolves to the parsed JSON part of the plan.
 */
const generatePlanPart = async (inputText: string, instruction: string, schema: any, addLog: (message: string) => void, context?: string) => {
  const fullInstruction = context ? `${context}\n\n${instruction}` : instruction;
  const response = await fetch(`${API_BASE_URL}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputText, SYSTEM_INSTRUCTION: fullInstruction, schema, safetySettings }),
  });
  addLog(`Plan part generation response status: ${response.status}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Plan generation failed: ${errorBody}`);
  }
  return response.json();
};

/**
 * Orchestrates the entire battle plan generation by breaking it into three sequential steps:
 * 1. Generate base identification and faction data.
 * 2. Generate map descriptions based on the battle name.
 * 3. Generate the storyboard frames based on the narrative summary.
 * This modular approach avoids hitting API token limits and allows for more focused AI tasks.
 * @param inputText The original user-provided text.
 * @param addLog A callback function for logging progress.
 * @returns A promise that resolves to the complete, assembled `BattlePlan`.
 */
export const generateBattlePlan = async (inputText: string, addLog: (message: string) => void): Promise<BattlePlan> => {
  addLog("Step 1: Generating base battle plan...");
  const baseInfo: { battle_identification: BattleIdentification, factions: Faction[] } = await generatePlanPart(inputText, SYSTEM_INSTRUCTION_BASE, base_schema, addLog);
  addLog(` -> Received Battle ID: ${baseInfo.battle_identification.name}`);
  addLog(` -> Received Factions: ${baseInfo.factions.map(f => f.name).join(', ')}`);

  addLog("Step 2: Generating map details...");
  const mapsContext = `The following text describes the Battle of ${baseInfo.battle_identification.name}.`;
  const mapsInfo: { maps: MapAsset[] } = await generatePlanPart(inputText, SYSTEM_INSTRUCTION_MAPS, maps_schema, addLog, mapsContext);
  addLog(` -> Received ${mapsInfo.maps.length} map definitions.`);

  addLog("Step 3: Generating storyboard frames...");
  const storyboardContext = `Based on the following summary, create a storyboard: "${baseInfo.battle_identification.narrative_summary}"`;
  const storyboardInfo: { storyboard: StoryboardFrame[] } = await generatePlanPart(inputText, SYSTEM_INSTRUCTION_STORYBOARD, storyboard_schema, addLog, storyboardContext);
  addLog(` -> Received ${storyboardInfo.storyboard.length} storyboard frames.`);

  const battlePlan: BattlePlan = { ...baseInfo, ...mapsInfo, ...storyboardInfo };
  addLog(`Complete plan received for: ${battlePlan.battle_identification.name}`);
  addLog(`Full Plan: ${JSON.stringify(battlePlan, null, 2)}`);
  return battlePlan;
};