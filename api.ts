import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { BATTLE_PLACEHOLDER } from './data/battle_placeholder';
import { BattleIdentification, BattlePlan, Faction, GeneratedAsset, MapAsset, StoryboardFrame } from './interfaces';
import { base_schema } from './schema/base_schema';
import { maps_schema } from './schema/maps_schema';
import { storyboard_schema } from './schema/storyboard_schema';
import { storyState } from './story-state';
import { sleep } from './utils';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

// Delay to stay within API rate limits for the planning model.
const PLAN_GENERATION_DELAY_MS = 5000; // 5 seconds

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Generates a new image from a text prompt.
 * @param prompt The text prompt to send to the image generation API.
 * @param caption The caption to associate with the generated asset.
 * @returns A promise that resolves to a `GeneratedAsset` object.
 */
export const executeImageGeneration = async (prompt: string, caption: string): Promise<GeneratedAsset> => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const imageResponse = await fetch(`${API_BASE_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, caption }),
      });
      if (!imageResponse.ok) {
        const errorBody = await imageResponse.text();
        // Don't retry on client errors (4xx), but do on server errors (5xx)
        if (imageResponse.status >= 400 && imageResponse.status < 500) {
          throw new Error(`Failed to generate image asset (${caption}): ${errorBody}`);
        }
        throw new Error(`Server error on image generation (${caption}): ${errorBody}`);
      }
      const { url, uri, mimeType, requestLog, responseLog } = await imageResponse.json();
      if (responseLog) {
        storyState.addLog(` -> API logs saved to ${requestLog} and ${responseLog}`);
      } else {
        storyState.addLog(` -> API request log saved to ${requestLog}`);
      }
      return { url, uri, mimeType, caption };
    } catch (error: any) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw new Error(`Failed to generate image asset (${caption}) after ${MAX_RETRIES} retries: ${error.message}`);
      }
      storyState.addLog(` -> Attempt ${retries} failed for "${caption}". Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  // This path should not be reachable.
  throw new Error(`Failed to generate image asset (${caption}) after ${MAX_RETRIES} retries.`);
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
export const executeImageEdit = async (currentImage: GeneratedAsset, prompt: string, caption: string, referenceAssets?: GeneratedAsset[]): Promise<GeneratedAsset> => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const body: {
        imageUri: string;
        imageMimeType: string;
        prompt: string;
        caption: string;
        reference_assets?: { uri: string; mimeType: string }[];
      } = {
        imageUri: currentImage.uri,
        imageMimeType: currentImage.mimeType,
        prompt,
        caption,
      };
      if (referenceAssets && referenceAssets.length > 0) {
        body.reference_assets = referenceAssets.map(asset => ({ uri: asset.uri, mimeType: asset.mimeType }));
      }
      const editResponse = await fetch(`${API_BASE_URL}/api/generate-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!editResponse.ok) {
        const errorBody = await editResponse.text();
        if (editResponse.status >= 400 && editResponse.status < 500) {
          throw new Error(`Failed to generate frame step (${caption}): ${errorBody}`);
        }
        throw new Error(`Server error on frame generation (${caption}): ${errorBody}`);
      }
      const { url, uri, mimeType, requestLog, responseLog } = await editResponse.json();
      if (responseLog) {
        storyState.addLog(` -> API logs saved to ${requestLog} and ${responseLog}`);
      } else {
        storyState.addLog(` -> API request log saved to ${requestLog}`);
      }
      return { url, uri, mimeType, caption };
    } catch (error: any) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw new Error(`Failed to generate frame step (${caption}) after ${MAX_RETRIES} retries: ${error.message}`);
      }
      storyState.addLog(` -> Attempt ${retries} failed for "${caption}". Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`Failed to generate frame step (${caption}) after ${MAX_RETRIES} retries.`);
};

/**
 * A generic function to call the planning API for a specific part of the battle plan.
 * This allows for a modular approach where different instructions and schemas can be used
 * for different parts of the generation process.
 * @param inputText The original user-provided text.
 * @param instruction The specific system instruction for this planning step.
 * @param schema The JSON schema the AI's response must conform to.
 * @param addLog A callback function for logging progress.
 * @param context Optional additional context to prepend to the system instruction. This is used to pass information from one planning step to the next.
 * @returns A promise that resolves to the parsed JSON part of the plan.
 */
const generatePlanPart = async (textPayload: { inputText: string } | { usePlaceholder: true }, instructionKey: 'base' | 'maps' | 'storyboard', schema: any, partName: string) => {
  const response = await fetch(`${API_BASE_URL}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...textPayload, instructionKey, schema, safetySettings, partName }),
  });
  storyState.addLog(`Plan part generation for '${partName}' response status: ${response.status}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Plan generation failed: ${errorBody}`);
  }
  const { requestLog, responseLog, ...planData } = await response.json();
  storyState.addLog(` -> Plan part logs saved to ${requestLog} and ${responseLog}`);
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
export const generateBattlePlan = async (inputText: string): Promise<BattlePlan> => {
  const isPlaceholder = inputText === BATTLE_PLACEHOLDER;
  const textPayload: { inputText: string } | { usePlaceholder: true } = isPlaceholder
    ? { usePlaceholder: true }
    : { inputText };

  storyState.addLog("Step 1: Generating base battle plan...");
  const baseInfo: { battle_identification: BattleIdentification, factions: Faction[] } = await generatePlanPart(textPayload, 'base', base_schema, 'base-info');
  storyState.addLog(` -> Received Battle ID: ${baseInfo.battle_identification.name}`);
  storyState.addLog(` -> Received Factions: ${baseInfo.factions.map(f => f.name).join(', ')}`);

  storyState.addLog(`Waiting ${PLAN_GENERATION_DELAY_MS / 1000}s before next step...`);
  await sleep(PLAN_GENERATION_DELAY_MS);

  storyState.addLog("Step 2: Generating map details...");
  const mapsInfo: { maps: MapAsset[] } = await generatePlanPart(textPayload, 'maps', maps_schema, 'maps');
  storyState.addLog(` -> Received ${mapsInfo.maps.length} map definitions.`);

  storyState.addLog(`Waiting ${PLAN_GENERATION_DELAY_MS / 1000}s before next step...`);
  await sleep(PLAN_GENERATION_DELAY_MS);

  storyState.addLog("Step 3: Generating storyboard frames...");
  const storyboardInfo: { storyboard: StoryboardFrame[] } = await generatePlanPart(textPayload, 'storyboard', storyboard_schema, 'storyboard');
  storyState.addLog(` -> Received ${storyboardInfo.storyboard.length} storyboard frames.`);

  const battlePlan: BattlePlan = { ...baseInfo, ...mapsInfo, ...storyboardInfo };
  storyState.addLog(`Complete plan received for: ${battlePlan.battle_identification.name}.`);
  return battlePlan;
};