// server.ts
import { GoogleGenAI, Modality } from '@google/genai';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger image payloads

const PORT = process.env.PORT || 3001;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey });

// Endpoint to generate the initial battle plan (Text generation - no changes needed)
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

// Endpoint to generate a single base asset image (Initial Image Generation)
app.post('/api/generate-image', async (req, res) => {
    const { prompt } = req.body;
    try {
        // CORRECTED: Use generateContent for gemini-2.5-flash-image-preview
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview', // Correct Model
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const imagePart = imageResponse.candidates[0].content.parts.find(part => part.inlineData);
        if (imagePart) {
            const base64Image = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            res.json({ base64: base64Image, mimeType: mimeType });
        } else {
            throw new Error("No image was generated for the asset.");
        }
    } catch (error) {
        console.error("Error in /api/generate-image:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to edit an image and generate a composite frame (Image Editing - was already correct)
app.post('/api/generate-frame', async (req, res) => {
    const { base64, mimeType, prompt } = req.body;
    try {
        const editResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview', // Correct Model
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

