export interface GeneratedAsset {
  url: string;
  base64: string;
  mimeType: string;
  caption?: string;
}

export interface StoryboardFrame {
  frame: number;
  description: string;
  base_asset: string;
  composite_prompts: {
    step: string;
    prompt: string;
  }[];
  source_text: string;
}

export interface StoredStory {
  id: string;
  name: string;
  plan: BattlePlan;
  assets: { [key: string]: GeneratedAsset };
  frames: GeneratedAsset[][];
}

export interface BattleIdentification {
  name: string;
  context: string;
}

export interface Faction {
  name: string;
  meeple_color: string;
  meeple_asset_name: string;
}

export interface RequiredAsset {
  asset_type: string;
  description: string;
}

export interface CompositePrompt {
  step: string;
  prompt: string;
}

export interface StoryboardFrame {
  frame: number;
  description: string;
  base_asset: string;
  composite_prompts: CompositePrompt[];
  source_text: string;
}

export interface BattlePlan {
  battle_identification: BattleIdentification;
  factions: Faction[];
  required_assets: RequiredAsset[];
  narrative_summary: string;
  storyboard: StoryboardFrame[];
}

export const schema: BattlePlan = {
  battle_identification: {
    name: '',
    context: ''
  },
  factions: [],
  required_assets: [],
  narrative_summary: '',
  storyboard: []
};

// --- COMPONENT PROPS INTERFACES ---
export interface LandingPageProps {
  onStoryCreate: (inputText: string) => void;
  isLoading: boolean;
}

export interface StorybookViewProps {
  story: StoredStory | null;
}

export interface ImageGalleryViewProps {
  assets: { [key: string]: GeneratedAsset };
  frames: GeneratedAsset[][];
}

export interface StoryCollectionViewProps {
  onSelectStory: (story: StoredStory) => void;
}

export interface DebugLogViewProps {
  log: { timestamp: string, message: string }[];
}

export interface WebAppProps {
  story: StoredStory | null;
  log: { timestamp: string, message: string }[];
  onRestart: () => void;
  onSelectStory: (story: StoredStory) => void;
  isLoading: boolean;
  realTimeAssets: { [key: string]: GeneratedAsset };
  realTimeFrames: GeneratedAsset[][];
}