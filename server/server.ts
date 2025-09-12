import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Part } from '@google/genai';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import { MODEL_GENERATE_IMAGE } from '../config';
import { StoredStory } from '../interfaces';
import { fileApiCache, handleImageApiResponse, saveContent, synchronizeStaticAssets } from './file-manager';
import { generateFullBattlePlan } from './planner';
import { lookupMime } from '../utils';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;

const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}
app.use('/tmp', express.static(TMP_DIR));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey });

(async () => {
  try {
    await synchronizeStaticAssets(ai, TMP_DIR);
  } catch (error) {
    console.error('[File API] Failed to synchronize static assets on startup:', error);
  }
})();

const imageSafetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }];

/**
 * @api {post} /api/generate-full-plan Generate a full battle plan
 * @apiName GenerateFullPlan
 * @apiGroup Plan
 *
 * @apiParam {string} [inputText] The user-provided text to generate a plan from.
 * @apiParam {boolean} [usePlaceholder] If true, uses a placeholder battle text instead of inputText.
 *
 * @apiSuccess {boolean} cached Indicates if the plan was retrieved from the cache.
 * @apiSuccess {object} plan The generated BattlePlan object.
 * @apiSuccess {string} [storyHash] A unique hash for the story, returned on a cache miss.
 *
 * @apiDescription
 * Generates a complete multi-step battle plan. It first checks for a cached version based on a hash of the input text.
 * On a cache miss, it calls the Gemini API sequentially for the base info, map details, and storyboard, respecting API rate limits.
 */
app.post('/api/generate-full-plan', async (req, res) => {
  try {
    const result = await generateFullBattlePlan(ai, fileApiCache, TMP_DIR, req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/generate-full-plan:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/cache-story Cache a completed story
 * @apiName CacheStory
 * @apiGroup Story
 *
 * @apiParam {string} storyHash The unique hash for the story, received from a `/api/generate-full-plan` call.
 * @apiParam {object} story The complete StoredStory object, including all generated asset URLs.
 *
 * @apiSuccess {string} message Confirmation message.
 *
 * @apiDescription
 * Saves a complete story object (plan and asset URLs) to a file in the `/tmp` directory,
 * using the story hash as the filename. This allows for quick retrieval on subsequent identical requests.
 */
app.post('/api/cache-story', async (req, res) => {
  const { storyHash, story } = req.body;
  if (!storyHash || !story) {
    return res.status(400).json({ error: 'storyHash and story are required.' });
  }

  try {
    const storyPath = path.join(TMP_DIR, `${storyHash}.json`);
    await fsp.writeFile(storyPath, JSON.stringify(story, null, 2));
    console.log(`[Cache] Saved final story for hash: ${storyHash}`);
    res.status(200).json({ message: 'Story cached successfully.' });
  } catch (error: any) {
    console.error("Error in /api/cache-story:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/generate-image Generate a single base asset image
 * @apiName GenerateImage
 * @apiGroup Image
 *
 * @apiParam {string} prompt The text prompt to generate an image from.
 * @apiParam {string} caption A caption for the generated image.
 *
 * @apiSuccess {string} url The public URL of the generated image.
 * @apiSuccess {string} uri The Google AI File API URI for the image.
 * @apiSuccess {string} mimeType The MIME type of the image.
 * @apiSuccess {string} requestLog The filename of the saved request log.
 *
 * @apiDescription Takes a text prompt and generates a single image using the Gemini API. The resulting image is saved, uploaded, and its details are returned.
 */
app.post('/api/generate-image', async (req, res) => {
  const { prompt, caption } = req.body;
  const requestLog = saveContent(JSON.stringify(req.body, null, 2), 'json', TMP_DIR);
  try {
    const result = await ai.models.generateContent({
      model: MODEL_GENERATE_IMAGE,
      contents: [{ parts: [{ text: prompt }] }],
      config: { safetySettings: imageSafetySettings },
    });

    await handleImageApiResponse(res, result, caption || 'generated-asset', ai, requestLog, TMP_DIR);
  } catch (error: any) {
    console.error("Error in /api/generate-image:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/generate-frame Edit an image to generate a composite frame
 * @apiName GenerateFrame
 * @apiGroup Image
 *
 * @apiParam {string} imageUri The File API URI of the base image to edit.
 * @apiParam {string} imageMimeType The MIME type of the base image.
 * @apiParam {string} promptKey A key identifying the deconstructed prompt (e.g., 'storyboard.placement').
 * @apiParam {string} dynamicText The variable part of the prompt.
 * @apiParam {string} caption A caption for the generated frame.
 * @apiParam {object[]} [reference_assets] An array of reference asset objects, each with a `uri` and `mimeType`.
 *
 * @apiSuccess {string} url The public URL of the generated frame.
 * @apiSuccess {string} uri The Google AI File API URI for the frame.
 * @apiSuccess {string} mimeType The MIME type of the frame.
 * @apiSuccess {string} requestLog The filename of the saved request log.
 *
 * @apiDescription Edits an existing image by applying a multi-part prompt. This is used for all layered storyboard composition steps, like placing meeples or drawing arrows.
 */
app.post('/api/generate-frame', async (req, res) => {
  const { imageUri, imageMimeType, promptKey, dynamicText, caption, reference_assets } = req.body;
  const requestLog = saveContent(JSON.stringify({ promptKey, dynamicText, imageUri, reference_assets }, null, 2), 'json', TMP_DIR);
  try {
    const prefixUri = fileApiCache.get(`${promptKey}.prefix`);
    const suffixUri = fileApiCache.get(`${promptKey}.suffix`);

    if (!prefixUri || !suffixUri) {
      return res.status(500).json({ error: `Prompt parts for key "${promptKey}" not found in cache.` });
    }

    const parts: Part[] = [
      { fileData: { fileUri: imageUri, mimeType: imageMimeType } },
    ];

    if (reference_assets && Array.isArray(reference_assets)) {
      for (const refAsset of reference_assets) {
        parts.push({ fileData: { fileUri: refAsset.uri, mimeType: refAsset.mimeType } });
      }
    }

    // The multi-part prompt
    parts.push({ fileData: { fileUri: prefixUri, mimeType: 'text/plain' } });
    if (dynamicText) {
      parts.push({ text: dynamicText });
    }
    parts.push({ fileData: { fileUri: suffixUri, mimeType: 'text/plain' } });

    const result = await ai.models.generateContent({
      model: MODEL_GENERATE_IMAGE,
      contents: [{ parts: parts }],
      config: { safetySettings: imageSafetySettings },
    });

    await handleImageApiResponse(res, result, caption || 'generated-frame', ai, requestLog, TMP_DIR);
  } catch (error: any) {
    console.error("Error in /api/generate-frame:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/upload-static-asset Upload a static asset
 * @apiName UploadStaticAsset
 * @apiGroup Asset
 *
 * @apiParam {string} url The relative path to the static asset in the project.
 * @apiParam {string} caption A caption for the asset.
 *
 * @apiSuccess {string} uri The Google AI File API URI for the uploaded asset.
 * @apiSuccess {string} mimeType The MIME type of the asset.
 *
 * @apiDescription Uploads a local static file (e.g., an image from `/public/images`) to the Google AI File API to get a reusable URI.
 */
app.post('/api/upload-static-asset', async (req, res) => {
  const { url, caption } = req.body;
  try {
    const mimeType = lookupMime(url);
    const uploadResult = await ai.files.upload({
      file: `${process.cwd()}${url}`,
      config: {
        mimeType: mimeType,
        displayName: caption,
      }
    });
    if (!uploadResult.uri) {
      throw new Error('File API did not return a URI.');
    }
    res.json({ uri: uploadResult.uri, mimeType });
  } catch (error: any) {
    console.error("Error in /api/upload-static-asset:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/save-log Save a log file
 * @apiName SaveLog
 * @apiGroup Utility
 *
 * @apiParam {string} filename The name of the file to save.
 * @apiParam {string} content The string content to write to the file.
 *
 * @apiSuccess {string} message Confirmation message.
 *
 * @apiDescription A simple utility endpoint to save string content to a specified file in the `/tmp` directory. Used for debugging purposes.
 */
app.post('/api/save-log', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || typeof content !== 'string') {
    return res.status(400).json({ error: 'Filename and content are required.' });
  }
  try {
    const filePath = path.join(TMP_DIR, filename);
    if (path.dirname(filePath) !== TMP_DIR) {
      throw new Error('Invalid filename');
    }
    fs.writeFileSync(filePath, content);
    res.status(200).json({ message: 'Log saved' });
  } catch (error: any) {
    console.error("Error in /api/save-log:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {get} /api/stories Get all cached stories
 * @apiName GetStories
 * @apiGroup Story
 *
 * @apiSuccess {StoredStory[]} An array of all cached story objects.
 *
 * @apiDescription
 * Reads all `.json` files from the `/tmp` directory, parses them as `StoredStory` objects,
 * and returns them as an array. This enables the "My Stories" collection feature on the frontend.
 */
app.get('/api/stories', async (req, res) => {
  try {
    const files = await fsp.readdir(TMP_DIR);
    const storyFiles = files.filter(file => file.endsWith('.json'));

    const stories: StoredStory[] = [];
    for (const file of storyFiles) {
      try {
        const content = await fsp.readFile(path.join(TMP_DIR, file), 'utf-8');
        const story = JSON.parse(content);
        // Basic validation to ensure it's a story object
        if (story.id && story.name && story.plan) {
          stories.push(story);
        }
      } catch (e) {
        console.error(`[Cache] Error reading or parsing story file ${file}:`, e);
      }
    }
    res.json(stories.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error: any) {
    console.error("Error in /api/stories:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Living Meeple server is running on ${process.env.VITE_SERVER_URL || `http://localhost:${PORT}`}`);
});
