import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { BATTLE_PLACEHOLDER } from './data/textbook_placeholder';
import { BattlePlan, GeneratedAsset, StoredStory } from './interfaces';
import { storyState } from './story-state';
import { sleep } from './utils';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Generates a new image from a text prompt.
 * @param prompt The text prompt to send to the image generation API.
 * @param caption The caption to associate with the generated asset.
 * @returns A promise that resolves to a `GeneratedAsset` object.
 */
export const executeImageGeneration = async (prompt: string, caption: string): Promise<GeneratedAsset> => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const imageResponse = await fetch(`${API_BASE_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, caption }),
      });
      if (!imageResponse.ok) {
        const errorBody = await imageResponse.text();
        // Don't retry on client errors (4xx), but do on server errors (5xx)
        if (imageResponse.status >= 400 && imageResponse.status < 500) {
          throw new Error(`Failed to generate image asset (${caption}): ${errorBody}`);
        }
        throw new Error(`Server error on image generation (${caption}): ${errorBody}`);
      }
      const { url, uri, mimeType, requestLog, responseLog } = await imageResponse.json();
      if (responseLog) {
        storyState.addLog(` -> API logs saved to ${requestLog} and ${responseLog}`);
      } else {
        storyState.addLog(` -> API request log saved to ${requestLog}`);
      }
      return { url, uri, mimeType, caption };
    } catch (error: any) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw new Error(`Failed to generate image asset (${caption}) after ${MAX_RETRIES} retries: ${error.message}`);
      }
      storyState.addLog(` -> Attempt ${retries} failed for "${caption}". Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  // This path should not be reachable.
  throw new Error(`Failed to generate image asset (${caption}) after ${MAX_RETRIES} retries.`);
};

/**
 * Edits an existing image based on a text prompt and an optional style reference.
 * This is used for all layered image composition steps.
 * @param currentImage The base image to be edited.
 * @param prompt The text prompt describing the edit.
 * @param promptKey A key identifying the deconstructed prompt to use (e.g., 'storyboard.placement').
 * @param dynamicText The dynamic part of the prompt constructed by the client.
 * @param caption The caption for the resulting asset.
 * @param referenceAssets An optional array of images to use as references (e.g., style guides, character models).
 * @returns A promise that resolves to the new, edited `GeneratedAsset`.
 */
export const executeImageEdit = async (currentImage: GeneratedAsset, promptKey: string, dynamicText: string, caption: string, referenceAssets?: GeneratedAsset[]): Promise<GeneratedAsset> => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const body: {
        imageUri: string;
        imageMimeType: string;
        promptKey: string;
        dynamicText: string;
        caption: string;
        reference_assets?: { uri: string; mimeType: string }[];
      } = {
        imageUri: currentImage.uri,
        imageMimeType: currentImage.mimeType,
        promptKey,
        dynamicText,
        caption,
      };
      if (referenceAssets && referenceAssets.length > 0) {
        body.reference_assets = referenceAssets.map(asset => ({ uri: asset.uri, mimeType: asset.mimeType }));
      }
      const editResponse = await fetch(`${API_BASE_URL}/api/generate-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!editResponse.ok) {
        const errorBody = await editResponse.text();
        if (editResponse.status >= 400 && editResponse.status < 500) {
          throw new Error(`Failed to generate frame step (${caption}): ${errorBody}`);
        }
        throw new Error(`Server error on frame generation (${caption}): ${errorBody}`);
      }
      const { url, uri, mimeType, requestLog, responseLog } = await editResponse.json();
      if (responseLog) {
        storyState.addLog(` -> API logs saved to ${requestLog} and ${responseLog}`);
      } else {
        storyState.addLog(` -> API request log saved to ${requestLog}`);
      }
      return { url, uri, mimeType, caption };
    } catch (error: any) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw new Error(`Failed to generate frame step (${caption}) after ${MAX_RETRIES} retries: ${error.message}`);
      }
      storyState.addLog(` -> Attempt ${retries} failed for "${caption}". Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`Failed to generate frame step (${caption}) after ${MAX_RETRIES} retries.`);
};


/**
 * Requests the full battle plan from the server. The server will either return
 * a cached version of the plan or generate a new one.
 * @param inputText The original user-provided text.
 * @returns A promise that resolves to either a full cached story or a new plan to be generated.
 */
export const generateBattlePlan = async (inputText: string): Promise<{ plan: BattlePlan, cached: boolean, story?: StoredStory, storyHash?: string }> => {
  const isPlaceholder = inputText === BATTLE_PLACEHOLDER;
  const body = isPlaceholder ? { usePlaceholder: true } : { inputText };

  storyState.addLog("Requesting battle plan from server...");
  const response = await fetch(`${API_BASE_URL}/api/generate-full-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, safetySettings }),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.text();
    throw new Error(`Full plan generation failed: ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new Promise((resolve, reject) => {
    const processStream = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'log') {
                storyState.addLog(parsed.data);
              } else if (parsed.type === 'result') {
                const result = parsed.data;
                if (result.cached) {
                  resolve({ plan: result.story.plan, story: result.story, cached: true });
                } else {
                  resolve({ plan: result.plan, cached: false, storyHash: result.storyHash });
                }
                reader.cancel();
                return;
              } else if (parsed.type === 'error') {
                reject(new Error(parsed.data.message));
                reader.cancel();
                return;
              }
            } catch (e) {
              console.error('Failed to parse streaming chunk from server:', line, e);
            }
          }
        }
      } catch (error) {
        reject(error);
      }
    };
    processStream();
  });
};

/**
 * Sends a completed story to the server to be cached for future requests.
 * This should be called by the application after all assets for a new story
 * have been successfully generated.
 * @param storyHash The SHA-256 hash of the original input text.
 * @param story The final, complete StoredStory object, including all asset URLs.
 */
export const cacheStory = async (storyHash: string, story: StoredStory): Promise<void> => {
  storyState.addLog(`Caching story on server...`);
  const response = await fetch(`${API_BASE_URL}/api/cache-story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyHash, story }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    storyState.addLog(` -> Failed to cache story: ${errorBody}`);
    // We don't throw here, as failing to cache is not a critical error for the user.
  } else {
    storyState.addLog(` -> Story cached successfully.`);
  }
};

/**
 * Fetches the collection of all previously generated (and cached) stories.
 * @returns A promise that resolves to an array of `StoredStory` objects.
 */
export const getStoryCollection = async (): Promise<StoredStory[]> => {
  storyState.addLog("Fetching story collection...");
  const response = await fetch(`${API_BASE_URL}/api/stories`);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch story collection: ${errorBody}`);
  }

  const stories = await response.json();
  storyState.addLog(` -> Found ${stories.length} cached stories.`);
  return stories;
};

/**
 * Deletes a cached story file from the server.
 * @param storyId The ID (hash) of the story to delete.
 */
export const deleteStory = async (storyId: string): Promise<void> => {
  storyState.addLog(`Deleting story ${storyId}...`);
  const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete story: ${errorBody}`);
  }
  storyState.addLog(` -> Story ${storyId} deleted.`);
};

/**
 * Fetches the list of all files from the Google AI File API.
 * @returns A promise that resolves to an array of file metadata objects.
 */
export const getFiles = async (): Promise<any[]> => {
  storyState.addLog("Fetching file list from Google AI API...");
  const response = await fetch(`${API_BASE_URL}/api/files`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch files: ${errorBody}`);
  }
  const files = await response.json();
  storyState.addLog(` -> Found ${files.length} files.`);
  return files;
};

/**
 * Deletes a specific file from the Google AI File API.
 * @param fileName The full name of the file (e.g., 'files/xxxxxx').
 */
export const deleteFile = async (fileName: string): Promise<void> => {
  storyState.addLog(`Deleting file ${fileName} from Google AI API...`);
  // The file ID is the part after "files/"
  const fileId = fileName.split('/').pop();
  if (!fileId) {
    throw new Error("Invalid file name format.");
  }
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete file: ${errorBody}`);
  }
  storyState.addLog(` -> File ${fileName} deleted.`);
};