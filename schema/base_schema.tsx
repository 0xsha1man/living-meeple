import { Type } from '@google/genai';

export const base_schema = {
    type: Type.OBJECT,
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
    },
    required: ["battle_identification", "factions"],
};