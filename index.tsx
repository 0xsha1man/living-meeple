/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { HarmBlockThreshold, HarmCategory, Type } from '@google/genai';
import React, { useState, useEffect, FC } from 'react';
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
  composite_prompts: {
    step: string;
    prompt: string;
  }[];
  sfx_suggestions: string[];
  narration_text: string;
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


// --- REFINED AI SYSTEM INSTRUCTION ---
const systemInstruction = `You are an AI Storyboard Director for "Living Meeple," a tool that visualizes historical text with a simple, clean, and kid-friendly aesthetic suitable for a children's history book or a high-quality wooden board game. Your primary goal is narrative comprehension, not tactical precision.

**AI Update Rules:**
1.  **Meeple Consistency:** You MUST first define unique \`faction_meeple\` assets for each faction. In the storyboard's composite prompts, you MUST reference these exact assets for placement (e.g., "Place the 'Union Meeple' asset"). Do not describe new meeples in every frame.
2.  **Map Scoping:** Regional maps must be tightly scoped to the immediate area of conflict (e.g., a few states), not the entire country.
3.  **Visual Subtlety & Clarity:**
    * Represent troop numbers with density. A larger force should be a denser cluster of meeples; a smaller force should be more spread out.
    * Movement arrows must be subtle, semi-transparent (20% opacity), and consistently styled as simple block arrows.
    * The "Fun FX" step must be used minimally. Avoid clutter. Use speech bubbles ONLY for critical moments like a charge or retreat.
    * Add text labels ONLY for major, named tactical movements (e.g., "Pickett's Charge"). Do not add a title to every frame.
4.  **Source Text Attribution:** For each storyboard frame, you MUST include the specific sentence(s) from the original text that the frame is visualizing in the 'source_text' field.

**Output Schema:** You will analyze the user's text and generate a JSON object based on the provided schema. This object will define the required assets and a multi-frame storyboard with composite image prompts, narration, SFX suggestions, and source text attribution for each frame.`;

const BATTLE_PLACEHOLDER = `Beginning in June 1863, General Lee began to move the Army of Northern Virginia north through Maryland. The Union army—the Army of the Potomac—traveled north to end up alongside the Confederate forces. The two armies met at Gettysburg, Pennsylvania, where Confederate forces had gone to secure supplies. The resulting battle lasted three days, July 1–3 and remains the biggest and costliest battle ever fought in North America. The climax of the Battle of Gettysburg occurred on the third day. In the morning, after a fight lasting several hours, Union forces fought back a Confederate attack on Culp’s Hill, one of the Union’s defensive positions. To regain a perceived advantage and secure victory, Lee ordered a frontal assault, known as Pickett’s Charge (for Confederate general George Pickett), against the center of the Union lines on Cemetery Ridge. Approximately fifteen thousand Confederate soldiers took part, and more than half lost their lives, as they advanced nearly a mile across an open field to attack the entrenched Union forces. In all, more than a third of the Army of Northern Virginia had been lost, and on the evening of July 4, Lee and his men slipped away in the rain. General George Meade did not pursue them. Both sides suffered staggering losses. Total casualties numbered around twenty-three thousand for the Union and some twenty-eight thousand among the Confederates. With its defeats at Gettysburg and Vicksburg, both on the same day, the Confederacy lost its momentum. The tide had turned in favor of the Union in both the east and the west.`;

// --- COMPONENT PROPS INTERFACES ---
interface LandingPageProps {
  onStoryCreate: (inputText: string) => void;
}

interface StorybookViewProps {
  story: StoredStory | null;
  onRestart: () => void;
}

interface ImageGalleryViewProps {
  story: StoredStory | null;
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
}


// --- COMPONENT: LandingPage ---
const LandingPage: FC<LandingPageProps> = ({ onStoryCreate }) => {
  const [inputText, setInputText] = useState('');

  const handleInsertExample = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setInputText(BATTLE_PLACEHOLDER);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim()) return;
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
              <button type="submit" disabled={!inputText.trim()} className="create-story-button">Create Story <i className="fas fa-arrow-right"></i></button>
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
        </div>
      </div>
      <footer className="footer">
        <p>A Hackathon Project for Kaggle's <a href="https://www.kaggle.com/competitions/banana" target="_blank" rel="noopener noreferrer">Nano-Banana Competition</a></p>
        <p><strong>Acknowledgements:</strong> Google AI, Imagen, Nano-Banana, and ElevenLabs.</p>
      </footer>
    </div>
  );
};

// --- COMPONENT: StorybookView ---
const StorybookView: FC<StorybookViewProps> = ({ story, onRestart }) => {
  const [pageIndex, setPageIndex] = useState(0);
  if (!story) return null;

  const { plan, frames } = story;
  const currentPageData = plan.storyboard[pageIndex];
  const currentPageImages = frames[pageIndex];
  const finalImageForPage = currentPageImages?.[currentPageImages.length - 1];

  const isLastPage = pageIndex === plan.storyboard.length - 1;

  return (
    <div className="storybook-view">
      <div className="storybook-main-content">
        <div className="storybook-image-panel card">
          {finalImageForPage ? (
            <img src={finalImageForPage.url} alt={currentPageData.description} />
          ) : (
            <div className="image-placeholder">Generating Page...</div>
          )}
        </div>
        <div className="storybook-details-panel">
          <div className="detail-card story-text">
            <p>{currentPageData.description}</p>
          </div>
          <div className="detail-card narration-text">
            <h4><i className="fas fa-microphone-alt"></i> Narration Script</h4>
            <p>{currentPageData.narration_text || "(No narration for this page)"}</p>
          </div>
          <div className="detail-card sfx-list">
            <h4><i className="fas fa-volume-up"></i> Sound Effects</h4>
            <ul>
              {currentPageData.sfx_suggestions.map((sfx, i) => <li key={i}>{sfx}</li>)}
            </ul>
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
        {isLastPage ? (
          <button onClick={onRestart} className="primary-button">Explore More History</button>
        ) : (
          <button onClick={() => setPageIndex(p => Math.min(plan.storyboard.length - 1, p + 1))}>
            Next Page <i className="fas fa-chevron-right"></i>
          </button>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT: ImageGalleryView ---
const ImageGalleryView: FC<ImageGalleryViewProps> = ({ story }) => {
  if (!story) return null;
  const allImages = [
    ...Object.values(story.assets),
    ...story.frames.flat()
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
    const stored = localStorage.getItem('livingMeepleStories');
    if (stored) {
      setStories(JSON.parse(stored));
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
const WebApp: FC<WebAppProps> = ({ story, log, onRestart, onSelectStory }) => {
  const [activeTab, setActiveTab] = useState('storybook');

  return (
    <div className="webapp-container">
      <nav className="webapp-nav">
        <button onClick={() => setActiveTab('storybook')} className={activeTab === 'storybook' ? 'active' : ''}><i className="fas fa-book-reader"></i> Storybook</button>
        <button onClick={() => setActiveTab('gallery')} className={activeTab === 'gallery' ? 'active' : ''}><i className="fas fa-images"></i> Image Gallery</button>
        <button onClick={() => setActiveTab('collection')} className={activeTab === 'collection' ? 'active' : ''}><i className="fas fa-archive"></i> My Stories</button>
        <button onClick={() => setActiveTab('debug')} className={activeTab === 'debug' ? 'active' : ''}><i className="fas fa-terminal"></i> Debug Log</button>
      </nav>
      <main className="webapp-content">
        {activeTab === 'storybook' && <StorybookView story={story} onRestart={onRestart} />}
        {activeTab === 'gallery' && <ImageGalleryView story={story} />}
        {activeTab === 'collection' && <StoryCollectionView onSelectStory={onSelectStory} />}
        {activeTab === 'debug' && <DebugLogView log={log} />}
      </main>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  const [view, setView] = useState<'landing' | 'loading' | 'webapp'>('landing');
  const [currentStory, setCurrentStory] = useState<StoredStory | null>(null);
  const [debugLog, setDebugLog] = useState<{ timestamp: string, message: string }[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { timestamp, message }]);
  };

  const handleCreateStory = async (inputText: string) => {
    setView('loading');
    setDebugLog([]);
    addLog("Starting story generation...");

    try {
      const serverUrl = 'http://localhost:3001';

      addLog("Sending text to server for planning...");
      const planResponse = await fetch(`${serverUrl}/api/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputText, systemInstruction, schema, safetySettings }),
      });
      if (!planResponse.ok) throw new Error(`Failed to fetch plan: ${await planResponse.text()}`);
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
        if (!imageResponse.ok) throw new Error(`Failed to generate asset ${asset.asset_type}`);
        const { base64, mimeType } = await imageResponse.json();
        assets[asset.asset_type] = {
          url: `data:${mimeType};base64,${base64}`,
          base64, mimeType, caption: `${asset.asset_type} (Base Asset)`
        };
      }
      addLog("All base assets generated.");

      const allFrames: GeneratedAsset[][] = [];
      for (let i = 0; i < battlePlan.storyboard.length; i++) {
        const frame = battlePlan.storyboard[i];
        addLog(`Compositing page ${i + 1} of ${battlePlan.storyboard.length}...`);

        const compositeImages: GeneratedAsset[] = [];
        let currentImage: GeneratedAsset | null = null;

        for (const [stepIndex, p] of frame.composite_prompts.entries()) {
          if (p.prompt.toLowerCase().includes('skip')) continue;

          if (stepIndex === 0) {
            const baseMapType = p.prompt.toLowerCase().includes('regional map') ? 'Regional Map' : 'Tactical Map';
            currentImage = assets[baseMapType];
          }

          if (!currentImage) throw new Error("Base image for compositing is missing.");

          addLog(` -> Step ${stepIndex + 1}: ${p.step}`);
          const editResponse = await fetch(`${serverUrl}/api/generate-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: currentImage.base64, mimeType: currentImage.mimeType, prompt: p.prompt }),
          });
          if (!editResponse.ok) throw new Error(`Failed to generate frame step`);

          const { base64, mimeType } = await editResponse.json();
          currentImage = {
            base64, mimeType, url: `data:${mimeType};base64,${base64}`,
            caption: `Page ${i + 1} - Step: ${p.step}`
          };
          compositeImages.push(currentImage);
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

      const stored = localStorage.getItem('livingMeepleStories') || '[]';
      const collection = JSON.parse(stored);
      collection.push(newStory);
      localStorage.setItem('livingMeepleStories', JSON.stringify(collection));

      setCurrentStory(newStory);
      addLog("Story generation complete!");
      setView('webapp');

    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      console.error(err);
      setView('landing'); // Go back to landing on error
    }
  };

  const handleSelectStory = (story: StoredStory) => {
    setCurrentStory(story);
    setView('webapp');
  };

  const handleRestart = () => {
    setCurrentStory(null);
    setView('landing');
  };

  if (view === 'loading') {
    return <div className="loading-fullscreen"><DebugLogView log={log} /></div>;
  }

  return (
    <div className="app-container">
      {view === 'landing' && <LandingPage onStoryCreate={handleCreateStory} />}
      {view === 'webapp' && <WebApp story={currentStory} log={debugLog} onRestart={handleRestart} onSelectStory={handleSelectStory} />}
    </div>
  );
}

// --- SCHEMA & CONSTANTS ---
const schema = {
  type: Type.OBJECT,
  properties: {
    battle_identification: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, context: { type: Type.STRING } } },
    factions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, meeple_color: { type: Type.STRING }, meeple_asset_name: { type: Type.STRING, description: "Unique asset name for this faction's meeple, e.g., 'Union Meeple'." } } } },
    required_assets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { asset_type: { type: Type.STRING }, description: { type: Type.STRING } } } },
    storyboard: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          frame: { type: Type.INTEGER },
          description: { type: Type.STRING },
          composite_prompts: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { step: { type: Type.STRING }, prompt: { type: Type.STRING } } }
          },
          sfx_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          narration_text: { type: Type.STRING },
          source_text: { type: Type.STRING, description: "The exact sentence(s) from the original text used as a reference for this frame." }
        }
      }
    }
  }
};

const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

