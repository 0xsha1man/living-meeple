import { Type } from '@google/genai';
import { base_schema } from './base_schema';
import { maps_schema } from './maps_schema';
import { storyboard_schema } from './storyboard_schema';

export const battle_plan_schema = {
    type: Type.OBJECT,
    description: "Schema for a detailed battle plan.",
    properties: {
        ...base_schema.properties,
        ...maps_schema.properties,
        ...storyboard_schema.properties,
    },
    required: [
        ...base_schema.required,
        ...maps_schema.required,
        ...storyboard_schema.required,
    ],
};
