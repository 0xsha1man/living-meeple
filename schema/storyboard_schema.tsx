import { Type } from '@google/genai';

export const storyboard_schema = {
    type: Type.OBJECT,
    properties: {
        storyboard: {
            type: Type.ARRAY,
            description: "MUST be a sequence of events that make up the battle's narrative.",
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
                                faction_asset_name: { type: Type.STRING, description: "The asset name of the faction to place (e.g., 'meeple_blue')." },
                                location: { type: Type.STRING, description: "The location on the map to place the meeples (e.g., 'Culp\\'s Hill')." },
                                amount: { type: Type.NUMBER, description: "The number of meeples to place." },
                                density: { type: Type.STRING, description: "A brief description of the meeple density, like 'densely packed' or 'scattered'." }
                            },
                            required: ["faction_asset_name", "location", "amount", "density"]
                        }
                    },
                    movements: {
                        type: Type.ARRAY,
                        description: "MUST be an array of meeple movements for this frame.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                faction_asset_name: { type: Type.STRING, description: "The asset name of the faction to move." },
                                starting_point: { type: Type.STRING, description: "The starting location of the movement." },
                                end_point: { type: Type.STRING, description: "The ending location of the movement." },
                                movement_type: { type: Type.STRING, description: "A description of the movement's intent, e.g., 'flanking maneuver around Culp\\'s Hill' or 'direct charge towards Cemetery Ridge'." }
                            },
                            required: ["faction_asset_name", "starting_point", "end_point", "movement_type"]
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