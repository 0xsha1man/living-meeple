/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { cacheStory, generateBattlePlan } from './api';
import { APP_CONFIG } from './config';
import { BattlePlan, GeneratedAsset, StoredStory } from './interfaces';
import { generateBaseAssets, generateStoryboardFrames } from './story-generator';
import { storyState } from './story-state';

/**
 * Manages the entire lifecycle of generating a story, from planning to asset
 * creation and final composition. It orchestrates API calls and updates the
 * application state with progress.
 */
export class StoryLifecycleManager {
  private totalSteps = 0;
  private completedSteps = 0;

  /**
   * Calculates the total number of generation steps based on the battle plan.
   * This is used for progress tracking.
   * @param plan The battle plan.
   * @returns The total number of steps.
   */
  private calculateTotalSteps(plan: BattlePlan): number {
    const numMeeples = plan.factions.length;
    const numMapLayers = plan.maps.length * 2; // features + landmarks
    const numFrames = plan.storyboard.length;
    return 1 + numMeeples + numMapLayers + numFrames;
  }

  /**
   * Updates the generation progress in the global state.
   * @param text The text to display for the current progress step.
   */
  private updateProgress(text: string) {
    this.completedSteps++;
    const progress = this.totalSteps > 0 ? this.completedSteps / this.totalSteps : 0;
    storyState.setProgress(progress, text);
  }

  /**
   * A wrapper for running a generation step. It logs the start and end of the
   * step and handles errors.
   * @param title The title of the step, used for logging.
   * @param action The async function to execute for this step.
   * @returns The result of the action.
   */
  private async runStep<T>(title: string, action: () => Promise<T>): Promise<T> {
    storyState.addLog(`[Lifecycle] Starting: ${title}...`);
    storyState.setProgressText(title);
    try {
      const result = await action();
      storyState.addLog(`[Lifecycle] Completed: ${title}`);
      return result;
    } catch (error: any) {
      storyState.addLog(`ERROR in step "${title}": ${error.message}`);
      throw error;
    }
  }

  /**
   * The main orchestration method. It drives the entire story generation process:
   * 1. Fetches or generates the battle plan.
   * 2. If the plan is new, it generates all base assets (maps, meeples).
   * 3. Generates all storyboard frames by composing assets.
   * 4. Caches the final story if it was newly generated.
   * @param inputText The user's input text for the story.
   * @returns A promise that resolves to the complete `StoredStory` object.
   */
  public async generate(inputText: string): Promise<StoredStory> {
    const { plan: battlePlan, cached, story, storyHash } = await this.runStep('Generating battle plan', () =>
      generateBattlePlan(inputText)
    );

    if (cached && story) {
      storyState.addLog("[Lifecycle] Finished loading cached story.");
      storyState.setProgress(1, "Finished");
      return story;
    }

    this.totalSteps = this.calculateTotalSteps(battlePlan);
    this.updateProgress(`Plan generated (${battlePlan.storyboard.length} pages)`);

    if (APP_CONFIG.generationMode === 'plan-only') {
      storyState.addLog("[Lifecycle] Generation stopped after creating BattlePlan (plan-only mode).");
      return { id: storyHash || '', name: battlePlan.battle_identification.name, plan: battlePlan, assets: {}, frames: [] };
    }

    const assets = await this.generateAssets(battlePlan);

    if (APP_CONFIG.generationMode === 'assets-only') {
      storyState.addLog("[Lifecycle] Generation stopped after creating base assets (assets-only mode).");
      return { id: storyHash || '', name: battlePlan.battle_identification.name, plan: battlePlan, assets, frames: [] };
    }

    const frames = await this.generateFrames(battlePlan, assets);

    const finalStory: StoredStory = {
      id: storyHash || new Date().toISOString(),
      name: battlePlan.battle_identification.name,
      plan: battlePlan,
      assets,
      frames,
    };

    if (storyHash) {
      await this.runStep('Caching story', () => cacheStory(storyHash, finalStory));
    }

    return finalStory;
  }

  /**
   * Generates all base assets (maps and meeples) as described in the battle plan.
   * @param battlePlan The battle plan.
   * @returns A promise that resolves to a dictionary of generated assets.
   */
  private async generateAssets(battlePlan: BattlePlan): Promise<{ [key: string]: GeneratedAsset }> {
    const numMeeples = battlePlan.factions.length;
    const numMapLayers = battlePlan.maps.length * 2;
    const totalAssets = numMeeples + numMapLayers;
    let assetCount = 0;

    const onAssetProgress = () => {
      assetCount++;
      this.updateProgress(`Generating asset ${assetCount} of ${totalAssets}`);
    };

    return this.runStep('Generating base assets', () =>
      generateBaseAssets(battlePlan, onAssetProgress)
    );
  }

  /**
   * Generates all storyboard frames by composing base assets.
   * @param battlePlan The battle plan.
   * @param assets A dictionary of the base assets.
   * @returns A promise that resolves to a 2D array of generated frame compositions.
   */
  private async generateFrames(battlePlan: BattlePlan, assets: { [key: string]: GeneratedAsset }): Promise<GeneratedAsset[][]> {
    const numFrames = battlePlan.storyboard.length;

    const onFrameProgress = (frameIndex: number) => {
      this.updateProgress(`Generating frame ${frameIndex} of ${numFrames}`);
    };

    return this.runStep('Generating storyboard frames', () =>
      generateStoryboardFrames(battlePlan, assets, onFrameProgress)
    );
  }
}