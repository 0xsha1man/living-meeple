/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { Footer } from './Footer';
import './index.css';
import { GeneratedAsset, StoredStory } from './interfaces';
import { LandingPage } from './LandingPage';
import { StoryLifecycleManager } from './story-lifecycle';
import { storyState } from './story-state';
import { WebApp } from './WebApp';

function App() {
  const [view, setView] = useState<'landing' | 'webapp'>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState<StoredStory | null>(null);
  const [debugLog, setDebugLog] = useState<{ timestamp: string, message: string }[]>([]);

  const [logFilename, setLogFilename] = useState('');
  const [realTimeAssets, setRealTimeAssets] = useState<{ [key: string]: GeneratedAsset }>({});
  const [realTimeFrames, setRealTimeFrames] = useState<GeneratedAsset[][]>([]);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    const handleStateChange = (newState: any) => {
      setIsLoading(newState.isLoading);
      setCurrentStory(newState.currentStory);
      setDebugLog(newState.debugLog);
      setRealTimeAssets(newState.realTimeAssets);
      setRealTimeFrames(newState.realTimeFrames);
      setProgress(newState.progress);
      setProgressText(newState.progressText);
      setLogFilename(newState.logFilename);
    };

    storyState.on('change', handleStateChange);
    return () => {
      storyState.off('change', handleStateChange);
    };
  }, []);

  const saveLogFile = async () => {
    const { logFilename, logFileContent } = storyState.getState();
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    try {
      await fetch(`${serverUrl}/api/save-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: logFilename,
          content: logFileContent
        })
      });
      storyState.addLog(`Full debug log saved to <a href="/tmp/${logFilename}" target="_blank" rel="noopener noreferrer">${logFilename}</a>`);
    } catch (logErr) {
      storyState.addLog(`ERROR: Failed to save debug log to file.`);
      console.error(logErr);
    }
  };

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
    storyState.reset();
    setView('webapp');
    storyState.addLog("[App] Starting story generation...");

    const lifecycleManager = new StoryLifecycleManager();

    try {
      const finalStory = await lifecycleManager.generate(inputText);
      storyState.setFinalStory(finalStory);
      storyState.addLog("[App] Storyboard generation complete!");
      storyState.setProgress(1, 'Complete!');
    } catch (err: any) {
      storyState.addLog(`[App] FATAL ERROR: ${err.message}`);
      console.error(err);
      storyState.setProgressText(`Error: ${err.message}`);
    } finally {
      storyState.setLoading(false);
      storyState.addLog("[App] Story generation finished.");
      await saveLogFile();
    }
  };

  const handleRestart = () => {
    storyState.setFinalStory(null);
    setView('landing');
  };

  const handleSelectStory = (selectedStory: StoredStory) => {
    storyState.setFinalStory(selectedStory);
    storyState.setLoading(false);
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
          progress={progress}
          progressText={progressText}
          logFilename={logFilename}
        />}
      </main>
      <Footer />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);