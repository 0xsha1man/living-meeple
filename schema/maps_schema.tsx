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
    },
    required: ["maps"],
};