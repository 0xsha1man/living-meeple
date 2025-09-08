import { Type } from '@google/genai';

export const battle_plan_schema = {
    type: Type.OBJECT,
    description: "Schema for a detailed battle plan.",
    properties: {
        battle_identification: {
            type: Type.OBJECT,
            description: "Core details identifying the battle.",
            properties: {
                name: {
                    type: Type.STRING,
                    description: "The official or common name of the battle."
                },
                context: {
                    type: Type.STRING,
                    description: "A single sentence describing the important context of the battle in history."
                },
                narrative_summary: {
                    type: Type.STRING,
                    description: "A 1-3 sentence summary of the battle answering WHO was involved, WHERE the battle was, and the final RESULT."
                },
            },
            required: ["name", "context", "narrative_summary"],
        },
        factions: {
            type: Type.ARRAY,
            description: "An array of the factions involved in the battle.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {
                        type: Type.STRING,
                        description: "The name of the faction."
                    },
                    meeple_color: {
                        type: Type.STRING,
                        description: "The representative color of the faction's pieces (e.g., 'red', 'blue')."
                    },
                    meeple_asset_name: {
                        type: Type.STRING,
                        description: "The asset or model name for this faction's game piece."
                    },
                },
                required: ["name", "meeple_color", "meeple_asset_name"],
            },
        },
        required_assets: {
            type: Type.ARRAY,
            description: "List of visual assets needed to represent the battle.",
            items: {
                type: Type.OBJECT,
                properties: {
                    asset_type: {
                        type: Type.STRING,
                        description: "The category of the asset (e.g., 'map', 'terrain', 'structure')."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A detailed description for generating or finding the asset."
                    },
                },
                required: ["asset_type", "description"]
            }
        },
        storyboard: {
            type: Type.ARRAY,
            description: "A sequence of events that make up the battle's narrative.",
            items: {
                type: Type.OBJECT,
                properties: {
                    frame: {
                        type: Type.NUMBER,
                        description: "The sequential order number for this storyboard frame."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A description of the action occurring in this frame."
                    },
                    base_asset: {
                        type: Type.STRING,
                        description: "The primary background or map asset for this frame."
                    },
                    composite_prompts: {
                        type: Type.ARRAY,
                        description: "Prompts for overlaying elements onto the base asset.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                step: {
                                    type: Type.STRING,
                                    description: "A name for the composite step (e.g., 'Place Attacker Units')."
                                },
                                prompt: {
                                    type: Type.STRING,
                                    description: "The specific instruction or prompt for this composition step."
                                },
                            },
                            required: ["step", "prompt"]
                        }
                    },
                    source_text: {
                        type: Type.STRING,
                        description: "The original text or source material this frame is based on."
                    },
                },
                required: ["frame", "description", "base_asset", "composite_prompts", "source_text"],
            },
        },
    },
    required: ["battle_identification", "factions", "required_assets", "storyboard"],
};