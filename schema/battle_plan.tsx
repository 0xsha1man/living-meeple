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
                    description: "A single sentence describing the important context of the battle in history suitable for a children's history book."
                },
                narrative_summary: {
                    type: Type.STRING,
                    description: "A 1-3 sentence summary of the battle answering WHO was involved, WHERE the battle was, and the final RESULT suitable for a children's history book."
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
                        description: "The asset name for this faction's game piece, in the format 'meeple_[color]' where [color] is the value of meeple_color (e.g., 'meeple_red').",
                        pattern: "^meeple_[a-z]+$"
                    },
                },
                required: ["name", "meeple_color", "meeple_asset_name"],
            },
        },
        maps: {
            type: Type.ARRAY,
            description: "An array of maps for the battle. A 'tactical' map is required. A 'regional' map is optional but recommended for context.",
            items: {
                type: Type.OBJECT,
                properties: {
                    map_type: {
                        type: Type.STRING,
                        description: "The type of map (e.g., 'tactical', 'regional')."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A detailed prompt for generating the map. For 'tactical' maps, describe the immediate battle area with key landmarks. For 'regional' maps, describe a zoomed-out view of the tactical map providing geographical context."
                    },
                    map_asset_name: {
                        type: Type.STRING,
                        description: "The asset name for this map, in the format '[map_type]_map' where [map_type] is the value of map_type (e.g., 'tactical_map').",
                        pattern: "^(tactical|regional)_map$"
                    },
                },
                required: ["map_type", "map_asset_name", "description"]
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
    required: ["battle_identification", "factions", "maps", "storyboard"],
};