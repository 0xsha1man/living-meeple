/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { HarmBlockThreshold, HarmCategory, Type } from '@google/genai';
import React, { FC, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// --- INTERFACES ---
interface GeneratedAsset {
  url: string;
  base64: string;
  mimeType: string;
  caption?: string;
}

interface StoryboardFrame {
  frame: number;
  description: string;
  base_asset: string;
  composite_prompts: {
    step: string;
    prompt: string;
  }[];
  source_text: string;
}

interface BattlePlan {
  battle_identification: {
    name: string;
    context: string;
  };
  factions: {
    name: string;
    meeple_color: string;
    meeple_asset_name: string;
  }[];
  required_assets: {
    asset_type: string;
    description: string;
  }[];
  storyboard: StoryboardFrame[];
}

interface StoredStory {
  id: string;
  name: string;
  plan: BattlePlan;
  assets: { [key: string]: GeneratedAsset };
  frames: GeneratedAsset[][];
}


// --- REFINED AI SYSTEM INSTRUCTION (FINAL SUBMISSION VERSION) ---
const systemInstruction = `You are an AI Storyboard Director for "Living Meeple." Your goal is to create a simple, clean, kid-friendly visualization of historical text. Focus on narrative comprehension, not tactical precision.

**AI Rules:**
1.  **Define Assets:** First, define the necessary 'faction_meeple' and 'Map' assets. The 'asset_type' for these MUST be simple, e.g., "Union Meeple", "Tactical Map".
2.  **Create Storyboard:** Break the text into a sequence of storyboard frames.
3.  **Frame Rules:**
    * For each frame, the 'base_asset' field MUST EXACTLY MATCH one of the 'asset_type' values defined in required_assets (e.g., "Tactical Map"). DO NOT use the description.
    * For each frame, you MUST provide the 'source_text' from the original paragraph.
    * Composite prompts should be simple instructions, like placing meeples or adding a single movement arrow. Keep it simple and clear.

**Output Schema:** Generate a JSON object based on the provided schema.`;

const BATTLE_PLACEHOLDER = `Beginning in June 1863, General Lee began to move the Army of Northern Virginia north through Maryland. The Union army—the Army of the Potomac—traveled north to end up alongside the Confederate forces. The two armies met at Gettysburg, Pennsylvania, where Confederate forces had gone to secure supplies. The resulting battle lasted three days, July 1–3 and remains the biggest and costliest battle ever fought in North America. The climax of the Battle of Gettysburg occurred on the third day. In the morning, after a fight lasting several hours, Union forces fought back a Confederate attack on Culp’s Hill, one of the Union’s defensive positions. To regain a perceived advantage and secure victory, Lee ordered a frontal assault, known as Pickett’s Charge (for Confederate general George Pickett), against the center of the Union lines on Cemetery Ridge. Approximately fifteen thousand Confederate soldiers took part, and more than half lost their lives, as they advanced nearly a mile across an open field to attack the entrenched Union forces. In all, more than a third of the Army of Northern Virginia had been lost, and on the evening of July 4, Lee and his men slipped away in the rain. General George Meade did not pursue them. Both sides suffered staggering losses. Total casualties numbered around twenty-three thousand for the Union and some twenty-eight thousand among the Confederates. With its defeats at Gettysburg and Vicksburg, both on the same day, the Confederacy lost its momentum. The tide had turned in favor of the Union in both the east and the west.`;

// --- COMPONENT PROPS INTERFACES ---
interface LandingPageProps {
  onStoryCreate: (inputText: string) => void;
  isLoading: boolean;
}

interface StorybookViewProps {
  story: StoredStory | null;
}

interface ImageGalleryViewProps {
  assets: { [key: string]: GeneratedAsset };
  frames: GeneratedAsset[][];
}

interface StoryCollectionViewProps {
  onSelectStory: (story: StoredStory) => void;
}

interface DebugLogViewProps {
  log: { timestamp: string, message: string }[];
}

interface WebAppProps {
  story: StoredStory | null;
  log: { timestamp: string, message: string }[];
  onRestart: () => void;
  onSelectStory: (story: StoredStory) => void;
  isLoading: boolean;
  realTimeAssets: { [key: string]: GeneratedAsset };
  realTimeFrames: GeneratedAsset[][];
}


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

// --- COMPONENT: StorybookView ---
const StorybookView: FC<StorybookViewProps> = ({ story }) => {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [story]);

  if (!story) return <div className="detail-card"><p>Your story will appear here once it's created!</p></div>;

  const { plan, frames } = story;
  const currentPageData = plan.storyboard[pageIndex];
  const currentPageImages = frames[pageIndex];
  const finalImageForPage = currentPageImages?.[currentPageImages.length - 1];

  return (
    <div className="storybook-view">
      <div className="storybook-main-content">
        <div className="storybook-image-panel card">
          {finalImageForPage ? (
            <img src={finalImageForPage.url} alt={currentPageData.description} />
          ) : (
            <div className="image-placeholder">Page content is being generated...</div>
          )}
        </div>
        <div className="storybook-details-panel">
          <div className="detail-card story-text">
            <p>{currentPageData.description}</p>
          </div>
          <div className="detail-card admin-view">
            <h4><i className="fas fa-quote-left"></i> Source Text</h4>
            <blockquote>"{currentPageData.source_text}"</blockquote>
          </div>
        </div>
      </div>
      <div className="storybook-controls">
        <button onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}>
          <i className="fas fa-chevron-left"></i> Previous Page
        </button>
        <span>Page {pageIndex + 1} of {plan.storyboard.length}</span>
        <button onClick={() => setPageIndex(p => Math.min(plan.storyboard.length - 1, p + 1))} disabled={pageIndex === plan.storyboard.length - 1}>
          Next Page <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

// --- COMPONENT: ImageGalleryView ---
const ImageGalleryView: FC<ImageGalleryViewProps> = ({ assets, frames }) => {
  if (Object.keys(assets).length === 0 && frames.length === 0) {
    return <div className="detail-card"><p>Your image gallery will appear here as images are generated.</p></div>;
  }
  const allImages = [
    ...Object.values(assets),
    ...frames.flat()
  ];

  return (
    <div className="image-gallery-view">
      <h2><i className="fas fa-images"></i> Generation Gallery</h2>
      <p>See every step of the image creation process, from base assets to final compositions.</p>
      <div className="gallery">
        {allImages.map((asset, index) => (
          <figure key={index}>
            <img src={asset.url} alt={asset.caption} />
            <figcaption>{asset.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENT: StoryCollectionView ---
const StoryCollectionView: FC<StoryCollectionViewProps> = ({ onSelectStory }) => {
  const [stories, setStories] = useState<StoredStory[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('livingMeepleStories');
      if (stored) {
        setStories(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Could not parse stories from localStorage", e);
    }
  }, []);

  return (
    <div className="story-collection-view">
      <h2><i className="fas fa-book"></i> My Story Collection</h2>
      <p>Revisit the historical stories you've created.</p>
      <div className="story-list">
        {stories.length > 0 ? stories.map(story => (
          <div className="story-card" key={story.id} onClick={() => onSelectStory(story)}>
            <h3>{story.name}</h3>
          </div>
        )) : <p>You haven't created any stories yet. Come back after you've made one!</p>}
      </div>
    </div>
  );
};

// --- COMPONENT: DebugLogView ---
const DebugLogView: FC<DebugLogViewProps> = ({ log }) => (
  <div className="debug-log-view">
    <h2><i className="fas fa-bug"></i> Debug Log</h2>
    <p>A real-time log of the generation process behind the scenes.</p>
    <pre>
      {log.map((entry, index) => <span key={index}>[{entry.timestamp}] {entry.message}<br /></span>)}
    </pre>
  </div>
);


// --- COMPONENT: WebApp ---
const WebApp: FC<WebAppProps> = ({ story, log, onRestart, onSelectStory, isLoading, realTimeAssets, realTimeFrames }) => {
  const [activeTab, setActiveTab] = useState('storybook');

  useEffect(() => {
    if (isLoading) {
      setActiveTab('debug');
    } else if (story) {
      setActiveTab('storybook');
    }
  }, [isLoading, story]);

  return (
    <div className="webapp-container">
      <nav className="webapp-nav">
        <button onClick={() => setActiveTab('storybook')} className={activeTab === 'storybook' ? 'active' : ''}><i className="fas fa-book-reader"></i> Storybook</button>
        <button onClick={() => setActiveTab('gallery')} className={activeTab === 'gallery' ? 'active' : ''}><i className="fas fa-images"></i> Image Gallery</button>
        <button onClick={() => setActiveTab('collection')} className={activeTab === 'collection' ? 'active' : ''}><i className="fas fa-archive"></i> My Stories</button>
        <button onClick={() => setActiveTab('debug')} className={activeTab === 'debug' ? 'active' : ''}><i className="fas fa-terminal"></i> Debug Log</button>
        <button onClick={onRestart} className="start-over-button"><i className="fas fa-undo"></i> Start Over</button>
      </nav>
      <main className="webapp-content">
        {activeTab === 'storybook' && <StorybookView story={story} />}
        {activeTab === 'gallery' && <ImageGalleryView assets={realTimeAssets} frames={realTimeFrames} />}
        {activeTab === 'collection' && <StoryCollectionView onSelectStory={onSelectStory} />}
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
        body: JSON.stringify({ inputText, systemInstruction, schema, safetySettings }),
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
            if (!newFrames[i]) newFrames[i] = [];
            newFrames[i] = [...compositeImages];
            return newFrames;
          });
        }
        allFrames.push(compositeImages);
      }

      const newStory: StoredStory = {
        id: new Date().toISOString(),
        name: battlePlan.battle_identification.name,
        plan: battlePlan,
        assets,
        frames: allFrames
      };

      const storyForCollection = {
        id: newStory.id,
        name: newStory.name,
        plan: newStory.plan,
      };

      const stored = localStorage.getItem('livingMeepleStories') || '[]';
      const collection = JSON.parse(stored);
      if (collection.length >= 10) {
        collection.shift();
      }
      collection.push(storyForCollection);
      localStorage.setItem('livingMeepleStories', JSON.stringify(collection));

      setCurrentStory(newStory);
      addLog("Story generation complete!");

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

// --- SCHEMA & CONSTANTS ---
const schema = {
  type: Type.OBJECT,
  properties: {
    battle_identification: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, context: { type: Type.STRING } } },
    factions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, meeple_color: { type: Type.STRING }, meeple_asset_name: { type: Type.STRING } } } },
    required_assets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { asset_type: { type: Type.STRING }, description: { type: Type.STRING } } } },
    storyboard: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          frame: { type: Type.INTEGER },
          description: { type: Type.STRING },
          base_asset: { type: Type.STRING },
          composite_prompts: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { step: { type: Type.STRING }, prompt: { type: Type.STRING } } }
          },
          source_text: { type: Type.STRING }
        }
      }
    }
  }
};

const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);