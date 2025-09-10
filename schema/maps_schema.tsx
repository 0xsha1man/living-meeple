import { Type } from '@google/genai';

export const maps_schema = {
    type: Type.OBJECT,
    properties: {
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
    },
    required: ["maps"],
};