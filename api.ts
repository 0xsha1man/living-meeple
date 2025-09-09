import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { SYSTEM_INSTRUCTION_BASE } from './data/system_instruction_base';
import { SYSTEM_INSTRUCTION_MAPS } from './data/system_instruction_maps';
import { SYSTEM_INSTRUCTION_STORYBOARD } from './data/system_instruction_storyboard';
import { BattleIdentification, BattlePlan, Faction, GeneratedAsset, MapAsset, StoryboardFrame } from './interfaces';
import { base_schema } from './schema/base_schema';
import { maps_schema } from './schema/maps_schema';
import { storyboard_schema } from './schema/storyboard_schema';
import { sleep } from './utils';

const API_BASE_URL = 'http://localhost:3001';
const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

// Delay to stay within API rate limits for the planning model.
const PLAN_GENERATION_DELAY_MS = 5000; // 5 seconds

/**
 * Generates a new image from a text prompt.
 * @param prompt The text prompt to send to the image generation API.
 * @param caption The caption to associate with the generated asset.
 * @returns A promise that resolves to a `GeneratedAsset` object.
 */
export const executeImageGeneration = async (prompt: string, caption: string, addLog: (message: string) => void): Promise<GeneratedAsset> => {
  const imageResponse = await fetch(`${API_BASE_URL}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!imageResponse.ok) {
    const errorBody = await imageResponse.text();
    throw new Error(`Failed to generate image asset (${caption}): ${errorBody}`);
  }
  const { url, requestLog, responseLog } = await imageResponse.json();
  if (responseLog) {
    addLog(` -> API logs saved to ${requestLog} and ${responseLog}`);
  } else {
    addLog(` -> API request log saved to ${requestLog}`);
  }
  return { url, caption };
};

/**
 * Edits an existing image based on a text prompt and an optional style reference.
 * This is used for all layered image composition steps.
 * @param currentImage The base image to be edited.
 * @param prompt The text prompt describing the edit.
 * @param caption The caption for the resulting asset.
 * @param referenceAssets An optional array of images to use as references (e.g., style guides, character models).
 * @returns A promise that resolves to the new, edited `GeneratedAsset`.
 */
export const executeImageEdit = async (currentImage: GeneratedAsset, prompt: string, caption: string, addLog: (message: string) => void, referenceAssets?: GeneratedAsset[]): Promise<GeneratedAsset> => {
  const body: {
    imageUrl: string;
    prompt: string;
    reference_urls?: string[];
  } = {
    imageUrl: currentImage.url,
    prompt,
  };
  if (referenceAssets && referenceAssets.length > 0) {
    body.reference_urls = referenceAssets.map(asset => asset.url);
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
  const { url, requestLog, responseLog } = await editResponse.json();
  if (responseLog) {
    addLog(` -> API logs saved to ${requestLog} and ${responseLog}`);
  } else {
    addLog(` -> API request log saved to ${requestLog}`);
  }
  return { url, caption };
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
const generatePlanPart = async (inputText: string, instruction: string, schema: any, addLog: (message: string) => void, partName: string) => {
  const response = await fetch(`${API_BASE_URL}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputText, SYSTEM_INSTRUCTION: instruction, schema, safetySettings, partName }),
  });
  addLog(`Plan part generation for '${partName}' response status: ${response.status}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Plan generation failed: ${errorBody}`);
  }
  const { requestLog, responseLog, ...planData } = await response.json();
  addLog(` -> Plan part logs saved to ${requestLog} and ${responseLog}`);
  return planData;
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
  const baseInfo: { battle_identification: BattleIdentification, factions: Faction[] } = await generatePlanPart(inputText, SYSTEM_INSTRUCTION_BASE, base_schema, addLog, 'base-info');
  addLog(` -> Received Battle ID: ${baseInfo.battle_identification.name}`);
  addLog(` -> Received Factions: ${baseInfo.factions.map(f => f.name).join(', ')}`);

  addLog(`Waiting ${PLAN_GENERATION_DELAY_MS / 1000}s before next step...`);
  await sleep(PLAN_GENERATION_DELAY_MS);

  addLog("Step 2: Generating map details...");
  // The map generator is now expected to derive all context from the full user text.
  const mapsInfo: { maps: MapAsset[] } = await generatePlanPart(inputText, SYSTEM_INSTRUCTION_MAPS, maps_schema, addLog, 'maps');
  addLog(` -> Received ${mapsInfo.maps.length} map definitions.`);

  addLog(`Waiting ${PLAN_GENERATION_DELAY_MS / 1000}s before next step...`);
  await sleep(PLAN_GENERATION_DELAY_MS);

  addLog("Step 3: Generating storyboard frames...");
  // The storyboard generator is given the full, original text to extract all key moments for the frames.
  const storyboardInfo: { storyboard: StoryboardFrame[] } = await generatePlanPart(inputText, SYSTEM_INSTRUCTION_STORYBOARD, storyboard_schema, addLog, 'storyboard');
  addLog(` -> Received ${storyboardInfo.storyboard.length} storyboard frames.`);

  const battlePlan: BattlePlan = { ...baseInfo, ...mapsInfo, ...storyboardInfo };
  addLog(`Complete plan received for: ${battlePlan.battle_identification.name}.`);
  return battlePlan;
};