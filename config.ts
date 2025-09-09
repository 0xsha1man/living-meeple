import { GenerationMode } from './interfaces';

// TODO: To enable caching for system instructions, a caching-compatible model is required.
// e.g. 'gemini-1.5-flash-001' or a specific version like 'gemini-1.5-flash-preview-0514'.
export const MODEL_GENERATE_PLAN = 'gemini-2.0-flash-lite';
export const MODEL_GENERATE_IMAGE = 'gemini-2.5-flash-image-preview';

export const APP_CONFIG: {
  generationMode: GenerationMode;
} = {
  // 'full': normal generation
  // 'plan-only': stop after generating the BattlePlan JSON
  // 'assets-only': stop after generating base assets (maps, meeples)
    generationMode: 'plan-only',
};
