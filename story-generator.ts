import React from 'react';
import { executeImageEdit, executeImageGeneration } from './api';
import { PROMPT_TEMPLATES } from './data/prompts';
import { BattlePlan, GeneratedAsset } from './interfaces';
import { fillPromptTemplate, sleep } from './utils';

// Delay to stay within API rate limits for the image generation model.
const IMAGE_GENERATION_DELAY_MS = 15000; // 15 seconds

/**
 * Fetches a static asset from a URL, converts it to base64, and returns it
 * as a `GeneratedAsset`. This is used for loading local style guides or other
 * reference images.
 * @param url The path to the static asset.
 * @param caption A descriptive caption for the asset.
 * @param addLog A callback function for logging progress.
 * @returns A promise that resolves to the loaded `GeneratedAsset`.
 */
const loadStaticAsset = async (url: string, caption: string, addLog: (message: string) => void): Promise<GeneratedAsset> => {
  addLog(`Using static asset: ${url}`);
  // The server will resolve this path relative to its public directory.
  return {
    url,
    caption,
  };
};

/**
 * Orchestrates the generation of all initial visual assets required for the story.
 * This function follows a layered approach, like building up cells in an animation,
 * to ensure a consistent look and feel.
 * 1. A neutral background texture is generated.
 * 2. The cartography style guide is loaded to ensure visual consistency for map features.
 * 3. For each map, topographical features and then key landmarks are layered on top of the background.
 * 4. Meeple figures for each faction are generated.
 *
 * @param battlePlan The master plan containing all necessary descriptions.
 * @param addLog A callback function for logging progress.
 * @param setRealTimeAssets A React state setter to display assets as they are generated.
 * @returns A promise that resolves to a dictionary of all generated base assets, keyed by their asset name.
 */
export const generateBaseAssets = async (
  battlePlan: BattlePlan,
  addLog: (message: string) => void,
  setRealTimeAssets: React.Dispatch<React.SetStateAction<{ [key: string]: GeneratedAsset }>>
): Promise<{ [key: string]: GeneratedAsset }> => {
  const assets: { [key: string]: GeneratedAsset } = {};

  addLog('Generating neutral map background...');
  const neutralBgAsset = await executeImageGeneration(PROMPT_TEMPLATES.base.neutralBackground, 'Neutral Map Background');
  setRealTimeAssets(prev => ({ ...prev, 'neutral_background': neutralBgAsset }));
  addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
  await sleep(IMAGE_GENERATION_DELAY_MS);

  addLog('Loading cartography style guide...');
  const cartographyGuideAsset = await loadStaticAsset('/images/cartography_style_guide.jpg', 'Cartography Style Guide', addLog);
  setRealTimeAssets(prev => ({ ...prev, 'cartography_guide': cartographyGuideAsset }));

  for (const map of battlePlan.maps) {
    addLog(`Generating map asset: ${map.map_asset_name}`);

    addLog(` -> Adding defining features for ${map.map_asset_name}`);
    const featuresPrompt = fillPromptTemplate(PROMPT_TEMPLATES.map.features, { description: map.defining_features_description });
    let currentMap = await executeImageEdit(neutralBgAsset, featuresPrompt, `${map.map_type} Map - Features`, cartographyGuideAsset);
    setRealTimeAssets(prev => ({ ...prev, [`${map.map_asset_name}_features`]: currentMap }));
    addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
    await sleep(IMAGE_GENERATION_DELAY_MS);

    addLog(` -> Adding key landmarks for ${map.map_asset_name}`);
    const landmarksPrompt = fillPromptTemplate(PROMPT_TEMPLATES.map.landmarks, { description: map.key_landmarks_description });
    const finalMapAsset = await executeImageEdit(currentMap, landmarksPrompt, `${map.map_type.charAt(0).toUpperCase() + map.map_type.slice(1)} Map (Base Asset)`, cartographyGuideAsset);

    assets[map.map_asset_name] = finalMapAsset;
    setRealTimeAssets(prev => ({ ...prev, [map.map_asset_name]: finalMapAsset }));
    addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
    await sleep(IMAGE_GENERATION_DELAY_MS);
  }

  for (const faction of battlePlan.factions) {
    addLog(`Generating meeple asset for: ${faction.name}`);
    const meepleAsset = await executeImageGeneration(faction.meeple_description, `${faction.name} Meeple (Base Asset)`);
    assets[faction.meeple_asset_name] = meepleAsset;
    setRealTimeAssets(prev => ({ ...prev, [faction.meeple_asset_name]: meepleAsset }));
    addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
    await sleep(IMAGE_GENERATION_DELAY_MS);
  }

  addLog("All base assets generated.");
  return assets;
};

/**
 * Generates the visual frames for each page of the storyboard.
 * It iterates through the `storyboard` array in the battle plan and, for each
 * page, applies the specified placements, movements, and labels as sequential
 * image edits on top of the correct base map. This layered composition ensures
 * that each step builds upon the previous one, creating the final narrative
 * image for the page.
 *
 * @param battlePlan The master plan containing the storyboard sequence.
 * @param assets A dictionary of the base assets (maps, meeples) generated by `generateBaseAssets`.
 * @param addLog A callback function for logging progress.
 * @param setRealTimeFrames A React state setter to display storyboard pages as they are composited.
 * @returns A promise that resolves to a 2D array of `GeneratedAsset`. Each inner array represents the sequence of image compositions for a single storyboard page.
 */
export const generateStoryboardFrames = async (
  battlePlan: BattlePlan,
  assets: { [key: string]: GeneratedAsset },
  addLog: (message: string) => void,
  setRealTimeFrames: React.Dispatch<React.SetStateAction<GeneratedAsset[][]>>
): Promise<GeneratedAsset[][]> => {
  const allFrames: GeneratedAsset[][] = [];

  for (let i = 0; i < battlePlan.storyboard.length; i++) {
    const frame = battlePlan.storyboard[i];
    addLog(`Compositing page ${i + 1} of ${battlePlan.storyboard.length}...`);

    const compositeImages: GeneratedAsset[] = [];
    let currentImage: GeneratedAsset | null = assets[frame.base_asset];

    if (!currentImage) {
      throw new Error(`Base asset "${frame.base_asset}" not found for page ${i + 1}.`);
    }

    if (frame.placements) {
      for (const placement of frame.placements) {
        addLog(` -> Placing ${placement.amount} ${placement.faction_asset_name} at ${placement.location}`);
        const prompt = fillPromptTemplate(PROMPT_TEMPLATES.storyboard.placement, { amount: placement.amount, assetName: placement.faction_asset_name, location: placement.location, density: placement.density });
        currentImage = await executeImageEdit(currentImage, prompt, `Page ${i + 1} - Place ${placement.faction_asset_name}`);
        compositeImages.push(currentImage);
        addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
        await sleep(IMAGE_GENERATION_DELAY_MS);
      }
    }

    if (frame.movements) {
      for (const movement of frame.movements) {
        addLog(` -> Adding movement arrows for ${movement.faction_asset_name} from ${movement.starting_point} to ${movement.end_point}`);
        const factionColor = movement.faction_asset_name.split('_')[1];
        const prompt = fillPromptTemplate(PROMPT_TEMPLATES.storyboard.movement, { color: factionColor, start: movement.starting_point, type: movement.movement_type, end: movement.end_point });
        currentImage = await executeImageEdit(currentImage, prompt, `Page ${i + 1} - Move ${movement.faction_asset_name}`);
        compositeImages.push(currentImage);
        addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
        await sleep(IMAGE_GENERATION_DELAY_MS);
      }
    }

    if (frame.labels) {
      for (const label of frame.labels) {
        addLog(` -> Adding label "${label.text}" at ${label.location}`);
        const prompt = fillPromptTemplate(PROMPT_TEMPLATES.storyboard.label, { text: label.text, location: label.location });
        currentImage = await executeImageEdit(currentImage, prompt, `Page ${i + 1} - Label ${label.text}`);
        compositeImages.push(currentImage);
        addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
        await sleep(IMAGE_GENERATION_DELAY_MS);
      }
    }

    allFrames.push(compositeImages);
    setRealTimeFrames(prev => {
      const newFrames = [...prev];
      newFrames[i] = [...compositeImages];
      return newFrames;
    });
  }
  return allFrames;
};