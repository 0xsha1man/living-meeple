// server.ts
import { GoogleGenAI, Modality, Part } from '@google/genai';
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

function saveImageAndGetUrl(buffer: Buffer, mimeType: string): string {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const extension = mimeType.split('/')[1] || 'png';
  const fileName = `${hash}.${extension}`;
  const filePath = path.join(TMP_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  // Return a URL path that the client can use
  return `/tmp/${fileName}`;
}

function lookupMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/png'; // default
}

// Endpoint to generate the initial battle plan
app.post('/api/generate-plan', async (req, res) => {
    const { inputText, SYSTEM_INSTRUCTION, schema, safetySettings } = req.body;
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
        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_PLAN,
            contents: [{ parts: [{ text: inputText }] }],
            config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema, safetySettings },
        });

        // **GUARD CLAUSE**
        if (!result.text) {
            throw new Error("Invalid or empty plan received from the API.");
        }
        res.json(JSON.parse(result.text));
    } catch (error: any) {
        console.error("Error in /api/generate-plan:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to generate a single base asset image
app.post('/api/generate-image', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_IMAGE,
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        // **CRITICAL FIX: Guard Clause**
        const imagePart = result?.candidates?.[0]?.content?.parts?.find((part: Part) => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
            const url = saveImageAndGetUrl(buffer, imagePart.inlineData.mimeType);
            res.json({ url });
        } else {
            console.error("Invalid response from Image API:", JSON.stringify(result, null, 2));
            throw new Error("No image was generated for the asset. The prompt may have been blocked or invalid.");
        }
    } catch (error: any) {
        console.error("Error in /api/generate-image:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to edit an image and generate a composite frame
app.post('/api/generate-frame', async (req, res) => {
    const { imageUrl, prompt, style_reference_url } = req.body;
    try {
        const imagePath = path.join(process.cwd(), imageUrl.slice(1));
        const base64 = fs.readFileSync(imagePath, 'base64');
        const mimeType = lookupMime(imagePath);

        const parts: Part[] = [
            { inlineData: { data: base64, mimeType: mimeType } },
        ];

        if (style_reference_url) {
            const stylePath = path.join(process.cwd(), 'public', style_reference_url.slice(1));
            const style_reference_base64 = fs.readFileSync(stylePath, 'base64');
            parts.push({ inlineData: { data: style_reference_base64, mimeType: 'image/jpeg' } });
        }

        parts.push({ text: prompt });

        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_IMAGE,
            contents: [{ parts: parts }],
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        // **CRITICAL FIX: Guard Clause**
        const imagePart = result?.candidates?.[0]?.content?.parts?.find((part: Part) => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
            const url = saveImageAndGetUrl(buffer, imagePart.inlineData.mimeType);
            res.json({ url });
        } else {
            console.error("Invalid response from Image API during frame generation:", JSON.stringify(result, null, 2));
            throw new Error("No image was generated for the frame. The prompt may have been blocked or invalid.");
        }
    } catch (error: any) {
        console.error("Error in /api/generate-frame:", error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`✅ Living Meeple server is running on ${process.env.VITE_SERVER_URL || `http://localhost:${PORT}`}`);
});