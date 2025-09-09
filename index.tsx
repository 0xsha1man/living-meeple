/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { generateBattlePlan } from './api';
import { APP_CONFIG } from './config';
import { generateBaseAssets, generateStoryboardFrames } from './story-generator';

import { Footer } from './Footer';
import './index.css';
import { BattlePlan, GeneratedAsset, StoredStory } from './interfaces';
import { LandingPage } from './LandingPage';
import { WebApp } from './WebApp';

// --- MAIN APP COMPONENT ---
function App() {
  const [view, setView] = useState<'landing' | 'webapp'>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState<StoredStory | null>(null);
  const [debugLog, setDebugLog] = useState<{ timestamp: string, message: string }[]>([]);
  const logFileContentRef = useRef('');
  const logFilenameRef = useRef('');

  const [realTimeAssets, setRealTimeAssets] = useState<{ [key: string]: GeneratedAsset }>({});
  const [realTimeFrames, setRealTimeFrames] = useState<GeneratedAsset[][]>([]);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message };
    const logLine = `[${timestamp}] ${message}\n`;
    setDebugLog(prev => [...prev, logEntry]);
    logFileContentRef.current += logLine;
  }, []);

  /**
   * The main orchestration function that drives the story generation process.
   * It follows a sequence of asynchronous steps:
   * 1. **Planning:** Sends the user's text to the AI to generate a structured `BattlePlan` JSON object. This is done in three modular parts (base info, maps, storyboard) to manage complexity and API limits.
   * 2. **Asset Generation:** Creates all the base visual assets (maps, meeples) described in the battle plan.
   * 3. **Frame Composition:** Renders each page of the storyboard by layering the assets and actions onto the base maps.
   *
   * It also manages the application's loading state and updates the UI with the final story.
   * @param inputText The historical text provided by the user.
   */
  const handleCreateStory = async (inputText: string) => {
    setIsLoading(true);
    setView('webapp');
    setDebugLog([]);
    setCurrentStory(null);
    setRealTimeAssets({});
    setRealTimeFrames([]);
    setProgress(0);
    setProgressText('');

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    logFilenameRef.current = `debug-${timestamp}.log`;
    logFileContentRef.current = ''; // Reset log content

    addLog("Starting story generation...");

    let battlePlan: BattlePlan;
    let assets: { [key: string]: GeneratedAsset };
    let frames: GeneratedAsset[][];

    let totalSteps = 0;
    let completedSteps = 0;

    try {
      addLog("Generating battle plan...");
      setProgressText('Generating plan...');
      battlePlan = await generateBattlePlan(inputText, addLog);

      const numMeeples = battlePlan.factions.length;
      const numMapLayers = battlePlan.maps.length * 2; // features + landmarks
      const numFrames = battlePlan.storyboard.length;
      totalSteps = 1 + numMeeples + numMapLayers + numFrames;

      completedSteps = 1;
      setProgress(completedSteps / totalSteps);
      setProgressText(`Plan generated (${battlePlan.storyboard.length} frames)`);

      if (APP_CONFIG.generationMode === 'plan-only') {
        addLog("Generation stopped after creating BattlePlan (plan-only mode).");
        const newStory: StoredStory = {
          id: new Date().toISOString(),
          name: battlePlan.battle_identification.name,
          plan: battlePlan,
          assets: {},
          frames: []
        };
        setCurrentStory(newStory);
        setIsLoading(false);
        setProgress(1);
        setProgressText('Complete (plan-only mode)');
        return;
      }

      let assetCount = 0;
      const updateAssetProgress = (assets: { [key: string]: GeneratedAsset }) => {
        setRealTimeAssets(assets);
        const currentAssetCount = Object.keys(assets).length;
        if (currentAssetCount > assetCount) {
          assetCount = currentAssetCount;
          completedSteps++;
          setProgress(completedSteps / totalSteps);
          setProgressText(`Generating asset ${assetCount} of ${numMeeples + numMapLayers}`);
        }
      };

      assets = await generateBaseAssets(battlePlan, addLog, updateAssetProgress);

      if (APP_CONFIG.generationMode === 'assets-only') {
        addLog("Generation stopped after creating base assets (assets-only mode).");
        const newStory: StoredStory = {
          id: new Date().toISOString(),
          name: battlePlan.battle_identification.name,
          plan: battlePlan,
          assets,
          frames: []
        };
        setCurrentStory(newStory);
        setIsLoading(false);
        setProgress(1);
        setProgressText('Complete (assets-only mode)');
        return;
      }

      frames = await generateStoryboardFrames(battlePlan, assets, addLog, setRealTimeFrames, (frameIndex) => {
        // The number of completed steps is: plan (1) + all assets + current frame
        completedSteps = 1 + numMeeples + numMapLayers + frameIndex;
        setProgress(completedSteps / totalSteps);
        setProgressText(`Generating frame ${frameIndex} of ${numFrames}`);
      });

      const newStory: StoredStory = {
        id: new Date().toISOString(),
        name: battlePlan.battle_identification.name,
        plan: battlePlan, assets,
        frames: frames
      };

      setCurrentStory(newStory);
      addLog("Storyboard generation complete!");

    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      addLog("Story generation finished.");
      try {
        await fetch('http://localhost:3001/api/save-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: logFilenameRef.current,
            content: logFileContentRef.current
          })
        });
        addLog(`Full debug log saved to /tmp/${logFilenameRef.current}`);
      } catch (logErr) {
        addLog(`ERROR: Failed to save debug log to file.`);
        console.error(logErr);
      }
    }
  };

  const handleSelectStory = (story: StoredStory) => {
    alert("Reloading full stories from the collection is a feature for another day! For the hackathon, you can generate new stories or view the one you just created.");
  };

  const handleRestart = () => {
    setCurrentStory(null);
    setView('landing');
  };

  return (
    <div className="app-container">
      <main className="app-main-content">
        {view === 'landing' && <LandingPage onStoryCreate={handleCreateStory} isLoading={isLoading} />}
        {view === 'webapp' && <WebApp
          story={currentStory}
          log={debugLog}
          onRestart={handleRestart}
          onSelectStory={handleSelectStory}
          isLoading={isLoading}
          realTimeAssets={realTimeAssets}
          realTimeFrames={realTimeFrames}
          generationMode={APP_CONFIG.generationMode}
          progress={progress}
          progressText={progressText}
        />}
      </main>
      <Footer />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);