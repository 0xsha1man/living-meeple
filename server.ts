// server.ts
import { GenerateContentResponse, GoogleGenAI, HarmBlockThreshold, HarmCategory, Part } from '@google/genai';
import cors from 'cors';
import crypto from 'crypto';
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { MODEL_GENERATE_IMAGE, MODEL_GENERATE_PLAN } from './config';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;

// --- Setup for persisting generated images ---
const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR);
}
app.use('/tmp', express.static(TMP_DIR));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey });

const imageSafetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }];

function saveImageAndGetUrl(buffer: Buffer, mimeType: string): { url: string, filePath: string } {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const extension = mimeType.split('/')[1] || 'png';
  const fileName = `${hash}.${extension}`;
  const filePath = path.join(TMP_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  // Return a URL path that the client can use and the full file path
  return { url: `/tmp/${fileName}`, filePath };
}

const saveContent = (content: string, extension: 'json' | 'txt'): string => {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const fileName = `${hash}.${extension}`;
  const filePath = path.join(TMP_DIR, fileName);
  fs.writeFileSync(filePath, content);
  return fileName;
};

async function handleImageApiResponse(
  res: express.Response,
  result: GenerateContentResponse,
  caption: string,
  ai: GoogleGenAI,
  requestLog: string
) {
  const imagePart = result?.candidates?.[0]?.content?.parts?.find((part: Part) => part.inlineData);

  if (imagePart && imagePart.inlineData) {
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const mimeType = imagePart.inlineData.mimeType;
    const { url, filePath } = saveImageAndGetUrl(buffer, mimeType);

    const uploadResult = await ai.files.upload({
      file: filePath,
      config: { mimeType, displayName: caption },
    });
    res.json({ url, uri: uploadResult.uri, mimeType, requestLog, responseLog: null });
  } else {
    const responseLog = saveContent(JSON.stringify(result, null, 2), 'json');
    throw new Error(`No image was generated. The prompt may have been blocked or invalid. Full API response saved to /tmp/${responseLog}`);
  }
}


function lookupMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/png'; // default
}

// Endpoint to generate the initial battle plan
app.post('/api/generate-plan', async (req, res) => {
    const { inputText, SYSTEM_INSTRUCTION, schema, safetySettings, partName } = req.body;
    try {
        // TODO: Implement caching for system instructions to reduce token count and improve latency.
        // This would involve:
        // 1. Creating a unique key for each instruction/schema combination (e.g., a hash of the instruction string).
        // 2. Checking if a `cachedContent` resource name exists for that key.
        // 3. If not, creating one using `ai.caches.create()` and storing its name.
        //    e.g., const cache = await ai.caches.create({ model: MODEL_GENERATE_PLAN, systemInstruction, tools: [{ functionDeclarations: [schema] }] });
        // 4. On subsequent requests, using the stored `cachedContent.name` in the `generateContent` call
        //    instead of passing the full `systemInstruction` and `schema` again.
        //    e.g., const result = await ai.models.generateContent({ model: MODEL_GENERATE_PLAN, cachedContent: cache.name, ... })
        const requestLog = saveContent(JSON.stringify(req.body, null, 2), 'json');
        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_PLAN,
            contents: [{ parts: [{ text: inputText }] }],
            config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema, safetySettings },
        });

        // **GUARD CLAUSE**
        if (!result.text) {
            throw new Error("Invalid or empty plan received from the API.");
        }
        const responseLog = saveContent(result.text, 'json');
        res.json({ ...JSON.parse(result.text), requestLog, responseLog });
    } catch (error: any) {
        console.error("Error in /api/generate-plan:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to generate a single base asset image
app.post('/api/generate-image', async (req, res) => {
    const { prompt, caption } = req.body;
    const requestLog = saveContent(JSON.stringify(req.body, null, 2), 'json');
    try {
        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_IMAGE,
            contents: prompt,
            config: { safetySettings: imageSafetySettings },
        });

        await handleImageApiResponse(res, result, caption || 'generated-asset', ai, requestLog);
    } catch (error: any) {
        console.error("Error in /api/generate-image:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to edit an image and generate a composite frame
app.post('/api/generate-frame', async (req, res) => {
    const { imageUri, imageMimeType, prompt, caption, reference_assets } = req.body;
    const requestLog = saveContent(JSON.stringify({ prompt, imageUri, reference_assets }, null, 2), 'json');
    try {
        const parts: Part[] = [
            { fileData: { fileUri: imageUri, mimeType: imageMimeType } },
        ];

        if (reference_assets && Array.isArray(reference_assets)) {
            for (const refAsset of reference_assets) {
                parts.push({
                    fileData: { fileUri: refAsset.uri, mimeType: refAsset.mimeType },
                });
            }
        }

        parts.push({ text: prompt });

        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_IMAGE,
            contents: [{ parts: parts }],
            config: { safetySettings: imageSafetySettings },
        });

        await handleImageApiResponse(res, result, caption || 'generated-frame', ai, requestLog);
    } catch (error: any) {
        console.error("Error in /api/generate-frame:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload-static-asset', async (req, res) => {
    const { url, caption } = req.body;
    try {
        // The URL from the client is relative to the project root. We construct the full file path for the SDK.
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

app.post('/api/save-log', (req, res) => {
    const { filename, content } = req.body;
    if (!filename || typeof content !== 'string') {
        return res.status(400).json({ error: 'Filename and content are required.' });
    }
    try {
        const filePath = path.join(TMP_DIR, filename);
        // Basic sanitization to prevent path traversal
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

app.listen(PORT, () => {
    console.log(`✅ Living Meeple server is running on ${process.env.VITE_SERVER_URL || `http://localhost:${PORT}`}`);
});