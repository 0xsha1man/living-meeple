export interface GeneratedAsset {
  url: string;
  uri: string;
  mimeType: string;
  caption: string;
}

export interface Placement {
  meeple_asset_name: string;
  location: string;
  amount: number;
  density: string;
}

export interface Movement {
  starting_point: string;
  end_point: string;
  movement_type: string;
}

export interface Label {
  text: string;
  location: string;
  context: string;
}

export interface StoryboardFrame {
  frame: number;
  description: string;
  base_asset: string;
  placements?: Placement[];
  movements?: Movement[];
  labels?: Label[];
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
  narrative_summary: string;
}

export interface Faction {
  name: string;
  meeple_color: string;
  meeple_asset_name: string;
  meeple_feature: string;
  meeple_description: string;
}

export interface MapAsset {
  map_type: 'tactical' | 'regional' | string;
  defining_features_description: string;
  key_landmarks_description: string;
  map_asset_name: string;
}

export interface BattlePlan {
  battle_identification: BattleIdentification;
  factions: Faction[];
  maps: MapAsset[];
  storyboard: StoryboardFrame[];
}

export const EMPTY_BATTLE_PLAN: BattlePlan = {
  battle_identification: {
    name: '',
    context: '',
    narrative_summary: ''
  },
  factions: [],
  maps: [],
  storyboard: []
};

// --- COMPONENT PROPS INTERFACES ---
export interface LandingPageProps {
  onStoryCreate: (inputText: string) => void;
  isLoading: boolean;
}

export interface StorybookViewProps {
  story: StoredStory | null;
  onImageClick: (url: string) => void;
}

export interface ImageGalleryViewProps {
  assets: { [key: string]: GeneratedAsset };
  frames: GeneratedAsset[][];
  onImageClick: (url: string) => void;
}

export interface DebugLogViewProps {
  log: { timestamp: string, message: string }[];
}

export type GenerationMode = 'full' | 'plan-only' | 'assets-only';

export interface WebAppProps {
  story: StoredStory | null;
  log: { timestamp: string, message: string }[];
  onRestart: () => void;
  isLoading: boolean;
  realTimeAssets: { [key: string]: GeneratedAsset };
  realTimeFrames: GeneratedAsset[][];
  progress: number;
  progressText: string;
}