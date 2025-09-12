// This schema defines the structure for generating the visual storyboard frames of the battle narrative.
// It is used in conjunction with the system instructions in /data/system_instruction_storyboard.tsx
import { Type } from '@google/genai';

export const STORYBOARD = {
    type: Type.OBJECT,
    properties: {
        storyboard: {
            type: Type.ARRAY,
            description: "MUST be a sequence of events that make up the battle's narrative, told as a visual story. Each frame should represent a key event as it begins to unfold, focusing on action and its outcome.",
            items: {
                type: Type.OBJECT,
                properties: {
                    frame: {
                        type: Type.NUMBER,
                        description: "The sequential order number for this storyboard frame."
                    },
                    description: {
                        type: Type.STRING,
                        description: "MUST be a description of the action occurring in this frame."
                    },
                    base_asset: {
                        type: Type.STRING,
                        description: "MUST be the base map asset for this frame, either 'tactical_map' or 'regional_map'."
                    },
                    placements: {
                        type: Type.ARRAY,
                        description: "MUST be an array of meeple placements for this frame.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                meeple_asset_name: { type: Type.STRING, description: "The asset name of the faction to place (e.g., 'meeple_blue')." },
                                location: { type: Type.STRING, description: "The location on the image canvas to place the meeples. MUST use image-relative terms (e.g., 'left side of the image', 'near the bottom center'). MUST NOT use geopolitical names." },
                                amount: { type: Type.NUMBER, description: "A small, representative number of meeples to place (between 3 and 10), reflecting the scale of the force described in the text." },
                                density: { type: Type.STRING, description: "A brief description of the meeple arrangement and posture, like 'densely packed in an attacking formation' or 'scattered in a defensive line'." }
                            },
                            required: ["meeple_asset_name", "location", "amount", "density"]
                        }
                    },
                    movements: {
                        type: Type.ARRAY,
                        description: "MUST be an array of meeple movements for this frame.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                starting_point: { type: Type.STRING, description: "The starting location of the movement. MUST originate from under the meeples being moved." },
                                end_point: { type: Type.STRING, description: "The ending location of the movement." },
                                movement_type: { type: Type.STRING, description: "A description of the movement's path and intent, e.g., 'a direct charge' or 'a curved flanking maneuver'." },
                            },
                            required: ["starting_point", "end_point", "movement_type",]
                        }
                    },
                    labels: {
                        type: Type.ARRAY,
                        description: "MUST be an array of text labels to add to the map for this frame. Only add labels that are essential for understanding the frame's intent.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING, description: "The text of the label (e.g., 'Culp\\'s Hill')." },
                                location: { type: Type.STRING, description: "The location on the map to place the text." },
                                context: { type: Type.STRING, description: "Why this text is important for understanding this frame's intent. If not essential, do not include the label." }
                            },
                            required: ["text", "location", "context"]
                        }
                    },
                    source_text: {
                        type: Type.STRING,
                        description: "MUST be the original text or source material this frame is based on."
                    },
                },
                required: ["frame", "description", "base_asset", "source_text"],
            },
        },
    },
    required: ["storyboard"],
};