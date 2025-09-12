import { Type } from '@google/genai';
import { ASSETS } from './assets_schema';
import { MAPS } from './maps_schema';
import { STORYBOARD } from './storyboard_schema';

export const SCHEMAS = {
    base: ASSETS,
    maps: MAPS,
    storyboard: STORYBOARD,
};

export const STORY_SCHEMA = {
    type: Type.OBJECT,
    description: "Schema for a detailed battle plan.",
    properties: {
        ...ASSETS.properties,
        ...MAPS.properties,
        ...STORYBOARD.properties,
    },
    required: [
        ...ASSETS.required,
        ...MAPS.required,
        ...STORYBOARD.required,
    ],
};
