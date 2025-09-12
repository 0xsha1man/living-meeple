import { executeImageEdit, executeImageGeneration } from './api';
import { DECONSTRUCTED_PROMPTS } from './data/prompts';
import { BattlePlan, GeneratedAsset } from './interfaces';
import { storyState } from './story-state';
import { fillPromptTemplate, sleep } from './utils';

// Delay to stay within API rate limits for the image generation model.
const IMAGE_GENERATION_DELAY_MS = 15000; // 15 seconds

/**
 * Fetches a static asset from a URL, converts it to base64, and returns it
 * as a `GeneratedAsset`. This is used for loading local style guides or other
 * reference images.
 * @param url The path to the static asset.
 * @param caption A descriptive caption for the asset.
 * @returns A promise that resolves to the loaded `GeneratedAsset`.
 */
const loadStaticAsset = async (url: string, caption: string): Promise<GeneratedAsset> => {
  storyState.addLog(`[Generator] Uploading static asset: ${url}`);
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  const response = await fetch(`${serverUrl}/api/upload-static-asset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, caption }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to upload static asset ${url}: ${errorBody}`);
  }

  const { uri, mimeType } = await response.json();
  return {
    url,
    uri,
    mimeType,
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
 * @param onAssetProgress A callback function to signal progress as each asset is generated.
 * @returns A promise that resolves to a dictionary of all generated base assets, keyed by their asset name.
 */
export const generateBaseAssets = async (
  battlePlan: BattlePlan,
  onAssetProgress: () => void
): Promise<{ [key: string]: GeneratedAsset }> => {
  const assets: { [key: string]: GeneratedAsset } = {};

  storyState.addLog('[Generator] Loading neutral map background...');
  const neutralBgAsset = await loadStaticAsset('/images/map_base.png', 'Neutral Map Background');
  storyState.addRealTimeAsset('neutral_background', neutralBgAsset);

  storyState.addLog('[Generator] Loading cartography style guide...');
  const cartographyGuideAsset = await loadStaticAsset('/images/style_guide.png', 'Cartography Style Guide');
  storyState.addRealTimeAsset('cartography_guide', cartographyGuideAsset);

  for (const map of battlePlan.maps) {
    storyState.addLog(`[Generator] Generating map asset: ${map.map_asset_name}`);

    storyState.addLog(`[Generator] Adding defining features for ${map.map_asset_name}`);
    const featuresDynamicText = fillPromptTemplate(DECONSTRUCTED_PROMPTS.map.features.template, { description: map.defining_features_description });
    let currentMap = await executeImageEdit(neutralBgAsset, 'map.features', featuresDynamicText, `${map.map_type.charAt(0).toUpperCase() + map.map_type.slice(1)} Map - Features`, [cartographyGuideAsset]);
    storyState.addRealTimeAsset(`${map.map_asset_name}_features`, currentMap);
    onAssetProgress();
    storyState.addLog(`[Generator] Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
    await sleep(IMAGE_GENERATION_DELAY_MS);

    storyState.addLog(`[Generator] Adding key landmarks for ${map.map_asset_name}`);
    const landmarksDynamicText = fillPromptTemplate(DECONSTRUCTED_PROMPTS.map.landmarks.template, { description: map.key_landmarks_description });
    const finalMapAsset = await executeImageEdit(currentMap, 'map.landmarks', landmarksDynamicText, `${map.map_type.charAt(0).toUpperCase() + map.map_type.slice(1)} Map (Base Asset)`, [cartographyGuideAsset]);
    onAssetProgress();

    assets[map.map_asset_name] = finalMapAsset;
    storyState.addRealTimeAsset(map.map_asset_name, finalMapAsset);
    storyState.addLog(`[Generator] Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
    await sleep(IMAGE_GENERATION_DELAY_MS);
  }

  for (const faction of battlePlan.factions) {
    storyState.addLog(`[Generator] Generating meeple asset for: ${faction.name}`);
    const meepleAsset = await executeImageGeneration(faction.meeple_description, `${faction.name} Meeple (Base Asset)`);
    assets[faction.meeple_asset_name] = meepleAsset;
    storyState.addRealTimeAsset(faction.meeple_asset_name, meepleAsset);
    onAssetProgress();
    storyState.addLog(`Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
    await sleep(IMAGE_GENERATION_DELAY_MS);
  }

  storyState.addLog("[Generator] All base assets generated.");
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
 * @param onProgress A callback function to signal progress as each page is completed.
 * @returns A promise that resolves to a 2D array of `GeneratedAsset`. Each inner array represents the sequence of image compositions for a single storyboard page.
 */
export const generateStoryboardFrames = async (
  battlePlan: BattlePlan,
  assets: { [key: string]: GeneratedAsset },
  onProgress: (frameIndex: number) => void
): Promise<GeneratedAsset[][]> => {
  const allFrames: GeneratedAsset[][] = [];

  for (let i = 0; i < battlePlan.storyboard.length; i++) {
    const frame = battlePlan.storyboard[i];
    storyState.addLog(`[Generator] Compositing page ${i + 1} of ${battlePlan.storyboard.length}...`);

    const compositeImages: GeneratedAsset[] = [];
    let currentImage: GeneratedAsset | null = assets[frame.base_asset];

    if (!currentImage) {
      throw new Error(`Base asset "${frame.base_asset}" not found for page ${i + 1}.`);
    }

    if (frame.placements) {
      for (const placement of frame.placements) {
        storyState.addLog(`[Generator] Placing ${placement.amount} ${placement.meeple_asset_name} at ${placement.location}`);
        const meepleAsset = assets[placement.meeple_asset_name];
        if (!meepleAsset) {
          throw new Error(`Meeple asset "${placement.meeple_asset_name}" not found.`);
        }
        const dynamicText = fillPromptTemplate(DECONSTRUCTED_PROMPTS.storyboard.placement.template, { amount: placement.amount, meeple_asset_name: placement.meeple_asset_name, location: placement.location, density: placement.density });
        currentImage = await executeImageEdit(currentImage, 'storyboard.placement', dynamicText, `Page ${i + 1} - Place ${placement.meeple_asset_name}`, [meepleAsset]);
        compositeImages.push(currentImage);
        storyState.addLog(`[Generator] Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
        await sleep(IMAGE_GENERATION_DELAY_MS);
      }
    }

    if (frame.movements) {
      for (const movement of frame.movements) {
        storyState.addLog(`[Generator] Adding movement arrows from ${movement.starting_point} to ${movement.end_point}`);
        const dynamicText = fillPromptTemplate(DECONSTRUCTED_PROMPTS.storyboard.movement.template, { start: movement.starting_point, type: movement.movement_type, end: movement.end_point });
        currentImage = await executeImageEdit(currentImage, 'storyboard.movement', dynamicText, `Page ${i + 1} - Movement Arrows`);
        compositeImages.push(currentImage);
        storyState.addLog(`[Generator] Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
        await sleep(IMAGE_GENERATION_DELAY_MS);
      }
    }

    if (frame.labels) {
      for (const label of frame.labels) {
        storyState.addLog(`[Generator] Adding label "${label.text}" at ${label.location}`);
        const dynamicText = fillPromptTemplate(DECONSTRUCTED_PROMPTS.storyboard.label.template, { text: label.text, location: label.location });
        currentImage = await executeImageEdit(currentImage, 'storyboard.label', dynamicText, `Page ${i + 1} - Label ${label.text}`);
        compositeImages.push(currentImage);
        storyState.addLog(`[Generator] Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s before next step...`);
        await sleep(IMAGE_GENERATION_DELAY_MS);
      }
    }

    allFrames.push(compositeImages);
    storyState.updateRealTimeFrames(i, compositeImages);
    onProgress(i + 1);
  }
  return allFrames;
};