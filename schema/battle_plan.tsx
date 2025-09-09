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
                    description: "MUST be the official or common name of the battle."
                },
                context: {
                    type: Type.STRING,
                    description: "MUST be a single sentence describing the important context of the battle in history suitable for a children's history book."
                },
                narrative_summary: {
                    type: Type.STRING,
                    description: "MUST be a 1-3 sentence summary of the battle answering WHO was involved, WHERE the battle was, and the final RESULT suitable for a children's history book."
                },
            },
            required: ["name", "context", "narrative_summary"],
        },
        factions: {
            type: Type.ARRAY,
            description: "MUST be an array of the factions involved in the battle.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {
                        type: Type.STRING,
                        description: "The name of the faction."
                    },
                    meeple_color: {
                        type: Type.STRING,
                        description: "MUST be the representative color of the faction's pieces (e.g., 'red', 'blue')."
                    },
                    meeple_asset_name: {
                        type: Type.STRING,
                        description: "MUST be the asset name for this faction's game piece, in the format 'meeple_[color]' where [color] is the value of meeple_color (e.g., 'meeple_red').",
                        pattern: "^meeple_[a-z]+$"
                    },
                    meeple_feature: {
                        type: Type.STRING,
                        description: "MUST be a single distinctive feature that can be integrated into the meeple's silhouette to represent the faction (e.g., 'Hardee hat' for Union, 'slouch hat' for Confederate)."
                    },
                    meeple_description: {
                        type: Type.STRING,
                        description: "MUST be a detailed prompt for generating the meeple image. It MUST describe a 'an illustration of a simple, wooden peg-like figure suitable for a board game in a solid matte [meeple_color] color. The figure has arms and a [meeple_feature] in a neutral, front-facing pose on a plain white background. The style MUST be suitable for a children's history textbook.'"
                    },
                },
                required: ["name", "meeple_color", "meeple_asset_name", "meeple_feature", "meeple_description"],
            },
        },
        maps: {
            type: Type.ARRAY,
            description: "MUST be an array of maps for the battle. A 'tactical' map is required. A 'regional' map is optional but recommended for context.",
            items: {
                type: Type.OBJECT,
                properties: {
                    map_type: {
                        type: Type.STRING,
                        description: "The type of map (e.g., 'tactical', 'regional')."
                    },
                    defining_features_description: {
                        type: Type.STRING,
                        description: "MUST be a description of the main topographical features of the area (e.g., 'a long, low ridge with a gentle slope to the east, and a prominent hill to the north with a wooded summit'). For a regional map, this should be a wider view."
                    },
                    key_landmarks_description: {
                        type: Type.STRING,
                        description: "MUST be a description of specific, named landmarks within the area (e.g., 'a small cemetery on the ridge'). For a regional map, this should be major boundary lines for context."
                    },
                    map_asset_name: {
                        type: Type.STRING,
                        description: "MUST be the asset name for this map, in the format '[map_type]_map' where [map_type] is the value of map_type (e.g., 'tactical_map').",
                        pattern: "^(tactical|regional)_map$"
                    },
                },
                required: ["map_type", "map_asset_name", "defining_features_description", "key_landmarks_description"]
            }
        },
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
    required: ["battle_identification", "factions", "maps", "storyboard"],
};
