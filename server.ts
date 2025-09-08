// server.ts
import { GoogleGenAI, Modality, Part } from '@google/genai';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { MODEL_GENERATE_IMAGE, MODEL_GENERATE_PLAN } from './config';
import { battle_plan_schema } from './schema/battle_plan';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey });

// Endpoint to generate the initial battle plan
app.post('/api/generate-plan', async (req, res) => {
    const { inputText, systemInstruction, safetySettings } = req.body;
    try {
        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_PLAN,
            contents: [{ parts: [{ text: inputText }] }],
            config: { systemInstruction, responseMimeType: 'application/json', responseSchema: battle_plan_schema, safetySettings },
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
            res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
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
    const { base64, mimeType, prompt } = req.body;
    try {
        const result = await ai.models.generateContent({
            model: MODEL_GENERATE_IMAGE,
            contents: [{ parts: [{ inlineData: { data: base64, mimeType: mimeType } }, { text: prompt }] }],
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        // **CRITICAL FIX: Guard Clause**
        const imagePart = result?.candidates?.[0]?.content?.parts?.find((part: Part) => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            res.json({ base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
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
    console.log(`✅ Living Meeple server is running on http://localhost:${PORT}`);
});