/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateBattlePlan } from './api';
import { APP_CONFIG } from './config';
import { BattlePlan, GeneratedAsset, StoredStory } from './interfaces';
import { generateBaseAssets, generateStoryboardFrames } from './story-generator';
import { storyState } from './story-state';

export class StoryLifecycleManager {
  private totalSteps = 0;
  private completedSteps = 0;

  private calculateTotalSteps(plan: BattlePlan): number {
    const numMeeples = plan.factions.length;
    const numMapLayers = plan.maps.length * 2; // features + landmarks
    const numFrames = plan.storyboard.length;
    return 1 + numMeeples + numMapLayers + numFrames;
  }

  private updateProgress(text: string) {
    this.completedSteps++;
    const progress = this.totalSteps > 0 ? this.completedSteps / this.totalSteps : 0;
    storyState.setProgress(progress, text);
  }

  private async runStep<T>(title: string, action: () => Promise<T>): Promise<T> {
    storyState.addLog(`Starting: ${title}...`);
    storyState.setProgressText(title);
    try {
      const result = await action();
      storyState.addLog(`Completed: ${title}`);
      return result;
    } catch (error: any) {
      storyState.addLog(`ERROR in step "${title}": ${error.message}`);
      throw error;
    }
  }

  public async generate(inputText: string): Promise<StoredStory> {
    const battlePlan = await this.runStep('Generating battle plan', () =>
      generateBattlePlan(inputText)
    );

    this.totalSteps = this.calculateTotalSteps(battlePlan);
    this.updateProgress(`Plan generated (${battlePlan.storyboard.length} frames)`);

    if (APP_CONFIG.generationMode === 'plan-only') {
      storyState.addLog("Generation stopped after creating BattlePlan (plan-only mode).");
      return { id: '', name: battlePlan.battle_identification.name, plan: battlePlan, assets: {}, frames: [] };
    }

    const assets = await this.generateAssets(battlePlan);

    if (APP_CONFIG.generationMode === 'assets-only') {
      storyState.addLog("Generation stopped after creating base assets (assets-only mode).");
      return { id: '', name: battlePlan.battle_identification.name, plan: battlePlan, assets, frames: [] };
    }

    const frames = await this.generateFrames(battlePlan, assets);

    return {
      id: new Date().toISOString(),
      name: battlePlan.battle_identification.name,
      plan: battlePlan,
      assets,
      frames,
    };
  }

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