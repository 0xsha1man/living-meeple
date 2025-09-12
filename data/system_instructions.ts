// This file consolidates all system instructions for the AI.

import { SYSTEM_INSTRUCTION_ASSETS } from './system_instruction_assets';
import { SYSTEM_INSTRUCTION_MAPS } from './system_instruction_maps';
import { SYSTEM_INSTRUCTION_STORYBOARD } from './system_instruction_storyboard';

export const SYSTEM_INSTRUCTIONS = {
  base: SYSTEM_INSTRUCTION_ASSETS,
  maps: SYSTEM_INSTRUCTION_MAPS,
  storyboard: SYSTEM_INSTRUCTION_STORYBOARD,
};