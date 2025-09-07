// server.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Modality } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger image payloads

const PORT = 3001;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey });

// Endpoint to generate the initial battle plan
app.post('/api/generate-plan', async (req, res) => {
    const { inputText, systemInstruction, schema, safetySettings } = req.body;
    try {
        const planResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: inputText,
            config: { systemInstruction, responseMimeType: 'application/json', responseSchema: schema, safetySettings },
        });
        res.json(JSON.parse(planResponse.text));
    } catch (error) {
        console.error("Error in /api/generate-plan:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to generate a single base asset image
app.post('/api/generate-image', async (req, res) => {
    const { prompt } = req.body;
    try {
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
        });
        const base64Image = imageResponse.generatedImages[0].image.imageBytes;
        const mimeType = imageResponse.generatedImages[0].image.mimeType;
        res.json({ base64: base64Image, mimeType: mimeType });
    } catch (error) {
        console.error("Error in /api/generate-image:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to edit an image and generate a composite frame
app.post('/api/generate-frame', async (req, res) => {
    const { base64, mimeType, prompt } = req.body;
    try {
        const editResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType: mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });
        const imagePart = editResponse.candidates[0].content.parts.find(part => part.inlineData);
        if (imagePart) {
            res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
        } else {
            throw new Error("No image was generated for the frame.");
        }
    } catch (error) {
        console.error("Error in /api/generate-frame:", error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`✅ Living Meeple server is running on http://localhost:${PORT}`);
});