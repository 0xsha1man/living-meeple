import { GoogleGenAI, Part } from '@google/genai';
import crypto from 'crypto';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import { MODEL_GENERATE_PLAN } from '../config';
import { SYSTEM_INSTRUCTIONS } from '../data/system_instructions';
import { BATTLE_PLACEHOLDER } from '../data/textbook_placeholder';
import { SCHEMAS } from '../schema/story_schema';
import { sleep } from '../utils';

const PLAN_GENERATION_DELAY_MS = 5000;

/**
 * Generates a single part of the battle plan by calling the Gemini API.
 * @param ai The GoogleGenAI instance.
 * @param fileApiCache A cache of uploaded file URIs.
 * @param instructionKey The key for the system instruction to use.
 * @param contentParts The content parts of the prompt.
 * @param safetySettings Safety settings for the API call.
 * @returns The parsed JSON part of the plan.
 */
async function generatePlanPart(
  ai: GoogleGenAI,
  fileApiCache: Map<string, string>,
  instructionKey: keyof typeof SYSTEM_INSTRUCTIONS,
  contentParts: Part[],
  safetySettings: any
) {
  const instructionUri = fileApiCache.get(`instruction_${instructionKey}`);
  if (!instructionUri) {
    throw new Error(`System instruction for key "${instructionKey}" not found in cache.`);
  }
  const allParts: Part[] = [
    { fileData: { mimeType: 'text/plain', fileUri: instructionUri } },
    ...contentParts,
  ];
  const result = await ai.models.generateContent({
    model: MODEL_GENERATE_PLAN,
    contents: [{ parts: allParts }],
    config: { responseMimeType: 'application/json', responseSchema: SCHEMAS[instructionKey], safetySettings },
  });
  if (!result.text) {
    throw new Error(`Invalid or empty plan part received from the API for ${instructionKey}.`);
  }
  return JSON.parse(result.text);
}

/**
 * Generates a full battle plan, checking for a cached version first.
 * If no cache is found, it orchestrates the multi-step generation process.
 */
export async function generateFullBattlePlan(
  ai: GoogleGenAI,
  fileApiCache: Map<string, string>,
  tmpDir: string,
  { inputText, usePlaceholder, safetySettings }: { inputText?: string, usePlaceholder?: boolean, safetySettings?: any },
  log: (message: string) => void
) {
  const textToHash = usePlaceholder ? BATTLE_PLACEHOLDER : inputText!;
  const storyHash = crypto.createHash('sha256').update(textToHash).digest('hex');
  const storyPath = path.join(tmpDir, `${storyHash}.json`);

  if (fs.existsSync(storyPath)) {
    const cachedStory = JSON.parse(await fsp.readFile(storyPath, 'utf-8'));
    log(`[Cache] Hit for story hash: ${storyHash}`);
    log(" -> Found cached story. Skipping generation.");
    return { cached: true, story: cachedStory };
  }

  log(`[Cache] Miss for story hash: ${storyHash}. Generating new plan.`);
  const contentParts: Part[] = usePlaceholder
    ? [{ fileData: { mimeType: 'text/plain', fileUri: fileApiCache.get('placeholder_battle')! } }]
    : [{ text: inputText! }];

  log(" -> Generating assets and battle identification...");
  const baseInfo = await generatePlanPart(ai, fileApiCache, 'base', contentParts, safetySettings);
  await sleep(PLAN_GENERATION_DELAY_MS);
  log(" -> Generating map details...");
  const mapsInfo = await generatePlanPart(ai, fileApiCache, 'maps', contentParts, safetySettings);
  await sleep(PLAN_GENERATION_DELAY_MS);
  log(" -> Generating storyboard frames...");
  const storyboardInfo = await generatePlanPart(ai, fileApiCache, 'storyboard', contentParts, safetySettings);

  log(` -> New plan received. Ready for asset generation.`);
  const battlePlan = { ...baseInfo, ...mapsInfo, ...storyboardInfo };
  return { cached: false, plan: battlePlan, storyHash };
}
