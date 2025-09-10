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
                        description: "MUST be a detailed prompt for generating the meeple image. It MUST be the following string, with [meeple_feature] and [meeple_color] replaced with the values you have determined for this faction: \"An illustration of a simple, faceless, wooden peg-like figure in an A-pose, suitable for a board game. The figure has a [meeple_feature]. It stands on a plain white background. The style MUST be suitable for a children's history textbook and sketched completely in a solid [meeple_color] color pencil with a dark gray outline around the figure.\""
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
                        description: "A description of the main topographical features. MUST describe placement using simple directional terms relative to the canvas (e.g., 'a long ridge running from the top to the bottom in the center of the image'). MUST NOT contain any text, labels, or names intended to be drawn on the map itself."
                    },
                    key_landmarks_description: {
                        type: Type.STRING,
                        description: "A description of specific, named landmarks. MUST only describe WHAT to draw and WHERE to draw it on the canvas (e.g., 'a small orchard of peach trees in the center of the image'). MUST NOT include historical context or any text, labels, or names intended to be drawn on the map itself."
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
                            required: ["starting_point", "end_point", "movement_type"]
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
