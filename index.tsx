/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import React, { FC, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BATTLE_PLACEHOLDER } from './data/battle_placeholder';
import { SYSTEM_INSTRUCTION } from './data/system_instruction';
import { DebugLogView } from './DebugLogView';
import { ImageGalleryView } from './ImageGalleryView';
import './index.css';
import { BattlePlan, GeneratedAsset, LandingPageProps, StoredStory, WebAppProps } from './interfaces';
import { StorybookView } from './StorybookView';

// --- COMPONENT: LandingPage ---
const LandingPage: FC<LandingPageProps> = ({ onStoryCreate, isLoading }) => {
  const [inputText, setInputText] = useState('');

  const handleInsertExample = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setInputText(BATTLE_PLACEHOLDER);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onStoryCreate(inputText);
  };

  return (
    <div className="landing-container">
      <h1 className="main-title">Living Meeple</h1>
      <p className="tagline">Turn dense history into delightful, meeple-sized stories.</p>
      <div className="panels-container">
        <div className="left-panel">
          <form className="form-container" onSubmit={handleSubmit}>
            <textarea
              name="historyText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Meeples eagerly wait to re-enact history for you! Paste a story here..."
              aria-label="Paste the story of a battle here"
              required
            />
            <div className="form-actions">
              <button type="button" onClick={handleInsertExample} className="example-link">
                <i className="fas fa-file-alt"></i> Insert Example from OpenStax
              </button>
              <button type="submit" disabled={!inputText.trim() || isLoading} className="create-story-button">
                {isLoading ? 'Creating...' : 'Create Story'} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </form>
        </div>
        <div className="right-panel">
          <div className="instructions card">
            <h2><i className="fas fa-book-open"></i> How It Works</h2>
            <ol>
              <li><strong>Paste History:</strong> Drop in text describing a historical event.</li>
              <li><strong>Create Story:</strong> Let the AI plan and generate a visual storybook.</li>
              <li><strong>Explore:</strong> Watch history unfold, page by page!</li>
            </ol>
          </div>
          <div className="mascot-container">
            <img src="images/mascot.png" alt="A friendly historian meeple reading a book" />
          </div>
        </div>
      </div>
      <footer className="footer">
        <p>A Hackathon Project for Kaggle's <a href="https://www.kaggle.com/competitions/banana" target="_blank" rel="noopener noreferrer">Nano-Banana Competition</a></p>
        <p><strong>Acknowledgements:</strong> Google AI, Gemini, and ElevenLabs.</p>
      </footer>
    </div>
  );
};

// --- COMPONENT: WebApp ---
const WebApp: FC<WebAppProps> = ({ story, log, onRestart, onSelectStory, isLoading, realTimeAssets, realTimeFrames }) => {
  const [activeTab, setActiveTab] = useState('storybook');

  useEffect(() => {
    if (isLoading) {
      setActiveTab('debug');
    } else if (story) {
      setActiveTab('gallery'); // Default to gallery to see the base assets
    }
  }, [isLoading, story]);

  return (
    <div className="webapp-container">
      <nav className="webapp-nav">
        <button onClick={() => setActiveTab('storybook')} className={activeTab === 'storybook' ? 'active' : ''}><i className="fas fa-book-reader"></i> Storybook</button>
        <button onClick={() => setActiveTab('gallery')} className={activeTab === 'gallery' ? 'active' : ''}><i className="fas fa-images"></i> Image Gallery</button>
        {/* <button onClick={() => setActiveTab('collection')} className={activeTab === 'collection' ? 'active' : ''}><i className="fas fa-archive"></i> My Stories</button> */}
        <button onClick={() => setActiveTab('debug')} className={activeTab === 'debug' ? 'active' : ''}><i className="fas fa-terminal"></i> Debug Log</button>
        <button onClick={onRestart} className="start-over-button"><i className="fas fa-undo"></i> Start Over</button>
      </nav>
      <main className="webapp-content">
        {activeTab === 'storybook' && <StorybookView story={story} />}
        {activeTab === 'gallery' && <ImageGalleryView assets={realTimeAssets} frames={realTimeFrames} />}
        {/* {activeTab === 'collection' && <StoryCollectionView onSelectStory={onSelectStory} />} */}
        {activeTab === 'debug' && <DebugLogView log={log} />}
      </main>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  const [view, setView] = useState<'landing' | 'webapp'>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState<StoredStory | null>(null);
  const [debugLog, setDebugLog] = useState<{ timestamp: string, message: string }[]>([]);

  // State for real-time updates
  const [realTimeAssets, setRealTimeAssets] = useState<{ [key: string]: GeneratedAsset }>({});
  const [realTimeFrames, setRealTimeFrames] = useState<GeneratedAsset[][]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { timestamp, message }]);
  };

  const handleCreateStory = async (inputText: string) => {
    setIsLoading(true);
    setView('webapp');
    setDebugLog([]);
    setCurrentStory(null);
    setRealTimeAssets({});
    setRealTimeFrames([]);

    addLog("Starting story generation...");

    try {
      const serverUrl = 'http://localhost:3001';

      addLog("Sending text to server for planning...");
      const planResponse = await fetch(`${serverUrl}/api/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputText, SYSTEM_INSTRUCTION, safetySettings }),
      });
      if (!planResponse.ok) {
        const errorBody = await planResponse.text();
        throw new Error(`Plan generation failed: ${errorBody}`);
      }
      const battlePlan: BattlePlan = await planResponse.json();
      addLog(`Plan received for: ${battlePlan.battle_identification.name}`);

      const assets: { [key: string]: GeneratedAsset } = {};
      for (const asset of battlePlan.required_assets) {
        addLog(`Generating base asset: ${asset.asset_type}`);
        const imageResponse = await fetch(`${serverUrl}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: asset.description }),
        });
        if (!imageResponse.ok) {
          const errorBody = await imageResponse.text();
          throw new Error(`Failed to generate asset ${asset.asset_type}: ${errorBody}`);
        }
        const { base64, mimeType } = await imageResponse.json();
        assets[asset.asset_type] = {
          url: `data:${mimeType};base64,${base64}`,
          base64, mimeType, caption: `${asset.asset_type} (Base Asset)`
        };
        setRealTimeAssets(prev => ({ ...prev, [asset.asset_type]: assets[asset.asset_type] }));
      }
      addLog("All base assets generated.");

      // --- STORYBOARD GENERATION COMMENTED OUT ---
      /*
      const allFrames: GeneratedAsset[][] = [];
      for (let i = 0; i < battlePlan.storyboard.length; i++) {
        const frame = battlePlan.storyboard[i];
        addLog(`Compositing page ${i + 1} of ${battlePlan.storyboard.length}...`);

        const compositeImages: GeneratedAsset[] = [];
        let currentImage: GeneratedAsset | null = assets[frame.base_asset];
        
        if (!currentImage) {
            throw new Error(`Base asset "${frame.base_asset}" not found for page ${i + 1}.`);
        }

        for (const [stepIndex, p] of frame.composite_prompts.entries()) {
          if (p.prompt.toLowerCase().includes('skip')) continue;
          
          addLog(` -> Step ${stepIndex + 1}: ${p.step}`);
          const editResponse = await fetch(`${serverUrl}/api/generate-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: currentImage.base64, mimeType: currentImage.mimeType, prompt: p.prompt }),
          });
          if (!editResponse.ok) {
              const errorBody = await editResponse.text();
              throw new Error(`Failed to generate frame step: ${errorBody}`);
          }

          const { base64, mimeType } = await editResponse.json();
          currentImage = {
            base64, mimeType, url: `data:${mimeType};base64,${base64}`,
            caption: `Page ${i + 1} - Step: ${p.step}`
          };
          compositeImages.push(currentImage);
          setRealTimeFrames(prev => {
              const newFrames = [...prev];
              if(!newFrames[i]) newFrames[i] = [];
              newFrames[i] = [...compositeImages];
              return newFrames;
          });
        }
        allFrames.push(compositeImages);
      }
      */

      const newStory: StoredStory = {
        id: new Date().toISOString(),
        name: battlePlan.battle_identification.name,
        plan: battlePlan,
        assets,
        frames: [] // No frames generated yet
      };

      setCurrentStory(newStory);
      addLog("Base asset generation complete! Storyboard generation is paused.");

    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
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
    </div>
  );
}

const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);