import { GenerateContentResponse, GoogleGenAI, Part } from '@google/genai';
import crypto from 'crypto';
import express from 'express';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import { DECONSTRUCTED_PROMPTS } from '../data/prompts';
import { SYSTEM_INSTRUCTIONS } from '../data/system_instructions';
import { BATTLE_PLACEHOLDER } from '../data/textbook_placeholder';

export const fileApiCache = new Map<string, string>();

/**
 * Uploads content to the Google AI File API if it's not already cached.
 * It uses a content hash to avoid re-uploading identical files.
 */
async function getOrUploadFile(log: (msg: string) => void, ai: GoogleGenAI, tmpDir: string, key: string, content: string, mimeType: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const cacheKey = `content-hash-${hash}`;

  if (fileApiCache.has(cacheKey)) {
    const uri = fileApiCache.get(cacheKey)!;
    // When we find a file by its content hash, we also need to map its
    // descriptive key to its URI for later, more semantic lookups.
    if (!fileApiCache.has(key)) {
      fileApiCache.set(key, uri);
    }
    return uri;
  }

  log(`[File API] Uploading ${key} (hash: ${hash.substring(0, 8)})...`);
  const tempFilePath = path.join(tmpDir, `${hash}.txt`);
  await fsp.writeFile(tempFilePath, content);

  try {
    const uploadResult = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType, displayName: cacheKey },
    });

    if (!uploadResult.uri) {
      throw new Error(`File API upload for ${key} did not return a URI.`);
    }
    const uri = uploadResult.uri;
    fileApiCache.set(cacheKey, uri);
    fileApiCache.set(key, uri); // Also cache by descriptive key
    log(`[File API] ...uploaded ${key}, URI: ${uploadResult.uri}`);
    return uri;
  } finally {
    await fsp.unlink(tempFilePath);
  }
}

/**
 * On server startup, checks for existing files on the File API and uploads any new or changed static assets.
 */
export async function synchronizeStaticAssets(log: (msg: string) => void, ai: GoogleGenAI, tmpDir: string) {
  log('[File API] Checking for existing files...');
  const listResponse = await ai.files.list({ config: { pageSize: 100 } });
  for await (const file of listResponse) {
    if (file.displayName && file.displayName.startsWith('content-hash-')) {
      fileApiCache.set(file.displayName, file.uri);
    }
  }
  log(`[File API] Pre-populated cache with ${fileApiCache.size} existing files.`);

  const assetsToSync = [
    { key: 'instruction_base', content: SYSTEM_INSTRUCTIONS.base, mimeType: 'text/plain' },
    { key: 'instruction_maps', content: SYSTEM_INSTRUCTIONS.maps, mimeType: 'text/plain' },
    { key: 'instruction_storyboard', content: SYSTEM_INSTRUCTIONS.storyboard, mimeType: 'text/plain' },
    { key: 'placeholder_battle', content: BATTLE_PLACEHOLDER, mimeType: 'text/plain' },
  ];

  for (const [categoryKey, category] of Object.entries(DECONSTRUCTED_PROMPTS)) {
    for (const [promptName, promptParts] of Object.entries(category)) {
      const keyPrefix = `${categoryKey}.${promptName}`;
      if (promptParts.prefix) assetsToSync.push({ key: `${keyPrefix}.prefix`, content: promptParts.prefix, mimeType: 'text/plain' });
      if (promptParts.suffix) assetsToSync.push({ key: `${keyPrefix}.suffix`, content: promptParts.suffix, mimeType: 'text/plain' });
    }
  }

  for (const asset of assetsToSync) {
    await getOrUploadFile(log, ai, tmpDir, asset.key, asset.content, asset.mimeType);
  }

  log('[File API] All static text assets synchronized.');
}

/**
 * Saves an image buffer to a temporary file and returns its public URL and full file path.
 */
export function saveImageAndGetUrl(buffer: Buffer, mimeType: string, tmpDir: string): { url: string, filePath: string } {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const extension = mimeType.split('/')[1] || 'png';
  const fileName = `${hash}.${extension}`;
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return { url: `/tmp/${fileName}`, filePath };
}

/**
 * Saves arbitrary string content to a temporary file with a given extension.
 */
export const saveContent = (content: string, extension: 'json' | 'txt', tmpDir: string): string => {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const fileName = `${hash}.${extension}`;
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, content);
  return fileName;
};

/**
 * Handles the response from the Gemini API for an image generation or editing task.
 */
export async function handleImageApiResponse(res: express.Response, result: GenerateContentResponse, caption: string, ai: GoogleGenAI, requestLog: string, tmpDir: string) {
  const imagePart = result?.candidates?.[0]?.content?.parts?.find((part: Part) => part.inlineData);
  if (imagePart?.inlineData) {
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const { url, filePath } = saveImageAndGetUrl(buffer, imagePart.inlineData.mimeType, tmpDir);
    const uploadResult = await ai.files.upload({ file: filePath, config: { mimeType: imagePart.inlineData.mimeType, displayName: caption } });
    res.json({ url, uri: uploadResult.uri, mimeType: imagePart.inlineData.mimeType, requestLog, responseLog: null });
  } else {
    const responseLog = saveContent(JSON.stringify(result, null, 2), 'json', tmpDir);
    throw new Error(`No image was generated. The prompt may have been blocked or invalid. Full API response saved to /tmp/${responseLog}`);
  }
}
