/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Modality, Type } from '@google/genai';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

const BATTLE_PLACEHOLDER = `Beginning in June 1863, General Lee began to move the Army of Northern Virginia north through Maryland. The Union army—the Army of the Potomac—traveled north to end up alongside the Confederate forces. The two armies met at Gettysburg, Pennsylvania, where Confederate forces had gone to secure supplies. The resulting battle lasted three days, July 1–3 (Figure 15.15) and remains the biggest and costliest battle ever fought in North America. The climax of the Battle of Gettysburg occurred on the third day. In the morning, after a fight lasting several hours, Union forces fought back a Confederate attack on Culp’s Hill, one of the Union’s defensive positions. To regain a perceived advantage and secure victory, Lee ordered a frontal assault, known as Pickett’s Charge (for Confederate general George Pickett), against the center of the Union lines on Cemetery Ridge. Approximately fifteen thousand Confederate soldiers took part, and more than half lost their lives, as they advanced nearly a mile across an open field to attack the entrenched Union forces. In all, more than a third of the Army of Northern Virginia had been lost, and on the evening of July 4, Lee and his men slipped away in the rain. General George Meade did not pursue them. Both sides suffered staggering losses. Total casualties numbered around twenty-three thousand for the Union and some twenty-eight thousand among the Confederates. With its defeats at Gettysburg and Vicksburg, both on the same day, the Confederacy lost its momentum. The tide had turned in favor of the Union in both the east and the west.`;

// FIX: Add interfaces for props and state to improve type safety.
interface ProgressBarProps {
  progress: {
    stage: string;
    percentage: number;
  };
}

function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="progress-bar-container">
      <div className="progress-label">{progress.stage}</div>
      <div className="progress-bar-outer">
        <div 
          className="progress-bar-inner" 
          style={{ width: `${progress.percentage}%` }}
          role="progressbar"
          aria-valuenow={progress.percentage}
          // FIX: The `aria-valuemin` and `aria-valuemax` attributes expect numbers, not strings.
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Generation progress"
        ></div>
      </div>
    </div>
  );
}

interface GeneratedAsset {
  url: string;
  base64: string;
  mimeType: string;
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
}

interface StoryboardPlayerProps {
  storyboard: StoryboardFrame[];
  generatedFrames: GeneratedAsset[][];
  generatedAssets: { [key: string]: GeneratedAsset };
}

function StoryboardPlayer({ storyboard, generatedFrames, generatedAssets }: StoryboardPlayerProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  const handlePrev = () => {
    setFrameIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setFrameIndex(prev => Math.min(storyboard.length - 1, prev + 1));
  };
  
  if (!storyboard?.length || !generatedFrames?.length) {
    return <p>Storyboard is not available.</p>;
  }
  
  const currentFrameData = storyboard[frameIndex];
  const currentFrameImages = generatedFrames[frameIndex];
  const finalImageForFrame = currentFrameImages?.[currentFrameImages.length - 1];

  return (
    <div className="card storyboard-player">
      <h2>Your Living Meeple Story</h2>
      <div className="storyboard-viewer">
        {finalImageForFrame ? (
          <img src={finalImageForFrame.url} alt={currentFrameData.description} className="storyboard-image" />
        ) : (
          <div className="storyboard-image-placeholder">Generating frame...</div>
        )}
        <div className="storyboard-controls">
          <button onClick={handlePrev} disabled={frameIndex === 0}>◀ Prev</button>
          <span>Frame {frameIndex + 1} of {storyboard.length}</span>
          <button onClick={handleNext} disabled={frameIndex === storyboard.length - 1}>Next ▶</button>
        </div>
      </div>
      <div className="storyboard-info">
        <h3>Frame Details</h3>
        <p className="frame-description">{currentFrameData.description}</p>
        <div className="narration-script">
          <h4>🎙️ Narration Script</h4>
          <p>{currentFrameData.narration_text || " (No narration for this frame)"}</p>
        </div>
        {currentFrameData.sfx_suggestions && (
          <div className="sfx-section">
            <h4>🔊 Sound Effect Ideas</h4>
            <ul className="sfx-list">
              {currentFrameData.sfx_suggestions.map((sfx, sfxIndex) => (
                <li key={sfxIndex}>{sfx}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface BattlePlan {
  battle_identification: {
    name: string;
    context: string;
  };
  factions: {
    name: string;
    meeple_color: string;
  }[];
  required_assets: {
    asset_type: string;
    description: string;
  }[];
  narrative_summary: string;
  storyboard: StoryboardFrame[];
}

function App() {
  const [inputText, setInputText] = useState('');
  // FIX: Add types for state to resolve 'unknown' type error on asset.url
  const [plan, setPlan] = useState<BattlePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ stage: '', percentage: 0 });
  const [generatedAssets, setGeneratedAssets] = useState<{ [key: string]: GeneratedAsset }>({});
  const [generatedStoryboardFrames, setGeneratedStoryboardFrames] = useState<(GeneratedAsset[])[]>([]);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `You are an AI Academic Content Creator for a tool that visualizes historical battles with meeple characters in a fun child-like imaginative way. The final content created is not to be tactical precision but focused on narrative comprehension. Making it easier to process dense paragraphs of text with media that clearly communicate the story of the battle: who was involved, how did the battle play out, and what was the general outcome. Your job is to analyze provided text by the user to identify the specific battle and historical context, the major factions involved in the battle, and then determine the list of essential base assets needed to create a visualization, then combine everything into a final format that will explain the historical events. You must follow the Asset Style Guide below precisely when creating the descriptions for the prepare_battle_assets function call.

Asset Style Guide
1. Overall Aesthetic
- All assets must have a simple, clean, and kid-friendly aesthetic suitable for a primary school textbook.
- The style should be reminiscent of a high-quality wooden board game or a modern children's history book illustration.
- All generated descriptions must be specific enough to ensure consistency.

2. Faction Generation Rules
- Each faction must be assigned a primary colored meeple.
- If possible the color should closely align with colors the faction is already known. For example American Civil War battles would require a blue meeple for the Union and a red meeple for the Confederate.

3. Map Generation Rules
- You must analyze the text to determine if a 'Tactical Map' and/or a 'Regional Map' are required. A 'Regional Map' is only needed if the text describes large-scale movements before the battle itself.
- Tactical Map Description: If required, the description must specify: "A simplified, clean tactical map of the immediate battle area. It must highlight key geographical features mentioned in the text (like Culp’s Hill, Cemetery Ridge, etc.) with light green shading or other simple markings. These features should be included on the base map even if they are only called out in later stages of the battle. The map must be uncluttered to serve as a clear base for later overlays. The style must be consistent with a children's history book map."
- Regional Map Description: If required, the description must specify: "A simple, stylized, and uncluttered map of the relevant region (e.g., showing states, important cities, or important landmarks to the battle). It must highlight the key battle location with a star. The map must be uncluttered to serve as a clear base for later overlays. The style must be consistent with a children's history book map."

After defining the assets and the storyboard, your next job is to break down each storyboard frame into a multi-step sequence of image editing prompts. This creates a composite frame, similar to layers in Photoshop. Follow this structure for each frame:

1. Prompt X.1 (Factions): Start with the appropriate base map asset (regional or tactical) and describe how to place the faction meeple assets to represent troop positions for this frame.
2. Prompt X.2 (Movement): Describe how to update the previous image by adding clear, colored arrows or other indicators to show the direction of army movements.
3. Prompt X.3 (Fun FX - Optional): This step is for adding creative, fun elements that match the child-like, 'toys telling a story' aesthetic. Be creative and add tongue-in-cheek moments. If appropriate for the frame, describe adding comic book style word/thought bubbles (e.g., "Charrrrrge!", "Re-treeet!", or a surprised "Uhh.. hi!" for an initial encounter), visual effects like toy cannonballs or puffs of smoke, or toy-like elements such as small wooden x-shaped barricades for defensive positions. If not needed, the prompt should state to skip this step.
4. Prompt X.4 (Finalize Text Rendering): Describe how to update the previous image by adding text labels for key landmarks, cities, or named tactical movements (e.g., "Pickett's Charge") to provide context.

For each storyboard frame, suggest a list of sound effects (SFX) that would enhance the scene. These SFX should match the playful, 'toys telling a story' aesthetic. Think about sounds like a toy bugle call for a retreat, 'clipy-cloppy' noises for toy horses, high-pitched 'Yayy! We did it!' cheers from the meeples, or classic 'pew pew pew' noises for toy cannons.

Finally, for each storyboard frame, create a short, kid-friendly narration text. This text will be read aloud. It should be concise and direct. If a frame is purely visual and doesn't need narration (e.g., a simple troop movement already described), this can be left empty. The narration should help tell the story in a fun, engaging way, suitable for a child. For example, for an opening frame: 'In June 1863, General Lee's army headed north looking for supplies!' For a closing frame: 'And that was the turning point of the war!'.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      battle_identification: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, context: { type: Type.STRING } } },
      factions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, meeple_color: { type: Type.STRING } } } },
      required_assets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { asset_type: { type: Type.STRING }, description: { type: Type.STRING } } } },
      narrative_summary: { type: Type.STRING },
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
            narration_text: { type: Type.STRING, description: "Short, kid-friendly narration for this frame. This may be empty if narration is not needed." }
          }
        }
      }
    }
  };

  const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPlan(null);
    setError('');
    setGeneratedAssets({});
    setGeneratedStoryboardFrames([]);
    setProgress({ stage: 'Starting...', percentage: 0 });

    try {
      // 1. Get the battle plan
      setProgress({ stage: 'Analyzing battle plan...', percentage: 5 });
      const planResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: inputText,
        config: { systemInstruction, responseMimeType: 'application/json', responseSchema: schema, safetySettings },
      });
      const battlePlan = JSON.parse(planResponse.text) as BattlePlan;
      setPlan(battlePlan);

      // 2. Generate base assets (maps)
      setProgress({ stage: 'Generating base maps...', percentage: 15 });
      const assets: { [key: string]: GeneratedAsset } = {};
      for (const asset of battlePlan.required_assets) {
        const imageResponse = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: asset.description,
          config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
        });
        const base64Image = imageResponse.generatedImages[0].image.imageBytes;
        const mimeType = imageResponse.generatedImages[0].image.mimeType;
        assets[asset.asset_type] = {
            url: `data:${mimeType};base64,${base64Image}`,
            base64: base64Image,
            mimeType: mimeType
        };
      }
      setGeneratedAssets(assets);

      // 3. Generate storyboard frames
      const allFrames: GeneratedAsset[][] = [];
      const totalFrames = battlePlan.storyboard.length;
      const progressPerFrame = (100 - 25) / totalFrames;

      for (let i = 0; i < totalFrames; i++) {
        const frame = battlePlan.storyboard[i];
        setProgress({ stage: `Creating frame ${i + 1} of ${totalFrames}...`, percentage: 25 + (i * progressPerFrame) });
        
        const compositeImages: GeneratedAsset[] = [];
        let currentImage: GeneratedAsset = assets['Tactical Map'] || assets['Regional Map']; // Start with a base map

        for (const p of frame.composite_prompts) {
          if (p.prompt.toLowerCase().includes('skip this step')) continue;

          const editResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ inlineData: { data: currentImage.base64, mimeType: currentImage.mimeType } }, { text: p.prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
          });

          const imagePart = editResponse.candidates[0].content.parts.find(part => part.inlineData);
          if (imagePart) {
            currentImage = {
                base64: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
                url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
            };
            compositeImages.push(currentImage);
          }
        }
        allFrames.push(compositeImages);
        setGeneratedStoryboardFrames([...allFrames]);
      }

      setProgress({ stage: 'Complete!', percentage: 100 });

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the story.');
      setProgress({ stage: 'Failed', percentage: 100 });
    } finally {
      setLoading(false);
    }
  };

  const handleInsertExample = (e) => {
    e.preventDefault();
    setInputText(BATTLE_PLACEHOLDER);
  };


  return (
    <div className="container">
      <header className="header">
        <h1>Living Meeple</h1>
        <p>Turn dense history into delightful, meeple-sized stories.</p>
      </header>
      
      <div className="instructions card">
        <h2>How It Works</h2>
        <ol>
            <li><strong>Paste History:</strong> Drop in text describing a historical event.</li>
            <li><strong>Create Story:</strong> Let the AI work its magic.</li>
            <li><strong>Explore:</strong> Click through the storyboard to see history unfold!</li>
        </ol>
      </div>

      <form className="form-container" onSubmit={handleSubmit}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste the story of a battle here..."
          aria-label="Paste the story of a battle here"
          required
        />
        <div className="form-helpers">
          <button type="button" onClick={handleInsertExample} className="example-link">
              Insert example text
          </button>
          <p className="attribution">
              Example from <a href="https://openstax.org/books/us-history/pages/15-3-1863-the-changing-nature-of-the-war" target="_blank" rel="noopener noreferrer">OpenStax U.S. History</a>
          </p>
        </div>
        <button type="submit" disabled={loading || !inputText.trim()}>
          {loading ? 'Creating...' : 'Create Story'}
        </button>
      </form>

      {loading && <ProgressBar progress={progress} />}

      {error && <div className="error-message" role="alert">{error}</div>}

      {plan && !loading && (
        <div className="results-container">
          <StoryboardPlayer 
            storyboard={plan.storyboard} 
            generatedFrames={generatedStoryboardFrames}
            generatedAssets={generatedAssets}
          />
          <details className="card">
            <summary>View Battle Plan Details</summary>
            <div className="details-content">
              <div className="card">
                <h2>Battle Identification</h2>
                <p><strong>{plan.battle_identification?.name}</strong></p>
                <p>{plan.battle_identification?.context}</p>
              </div>
              <div className="card">
                <h2>Factions</h2>
                <ul>
                  {plan.factions?.map((faction, index) => (
                    <li key={index} className="faction-item">
                      <div className="meeple-color" style={{ backgroundColor: faction.meeple_color.toLowerCase() }}></div>
                      <span>{faction.name} ({faction.meeple_color})</span>
                    </li>
                  ))}
                </ul>
              </div>
               <div className="card">
                <h2>Generated Base Assets</h2>
                {Object.keys(generatedAssets).length > 0 && (
                <div className="asset-gallery">
                  {Object.entries(generatedAssets).map(([name, asset]: [string, GeneratedAsset]) => (
                    <div key={name}>
                      <strong>{name}</strong>
                      <img src={asset.url} alt={name} className="asset-thumbnail" />
                    </div>
                  ))}
                </div>
                )}
              </div>
              <div className="card">
                <h2>Narrative Summary</h2>
                <p>{plan.narrative_summary}</p>
              </div>
            </div>
          </details>
        </div>
      )}
      <footer className="footer">
        <p>Living Meeple is brought to life with incredible technology.</p>
        <p><strong>Acknowledgements:</strong> Google AI Studio, Imagen, Nano-Banana, and ElevenLabs.</p>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);