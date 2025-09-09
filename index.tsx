/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { generateBattlePlan } from './api';
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

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    logFilenameRef.current = `debug-${timestamp}.log`;
    logFileContentRef.current = ''; // Reset log content

    addLog("Starting story generation...");

    let battlePlan: BattlePlan;
    let assets: { [key: string]: GeneratedAsset };
    let frames: GeneratedAsset[][];

    try {
      battlePlan = await generateBattlePlan(inputText, addLog);
      assets = await generateBaseAssets(battlePlan, addLog, setRealTimeAssets);
      frames = await generateStoryboardFrames(battlePlan, assets, addLog, setRealTimeFrames);

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
        />}
      </main>
      <Footer />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);