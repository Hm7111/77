import { letterTemplatesChunk1 } from './letterTemplatesChunk1';
import { letterTemplatesChunk2 } from './letterTemplatesChunk2';
import { letterTemplatesChunk3 } from './letterTemplatesChunk3';

// Combine all template chunks
export const letterTemplates = [
  ...letterTemplatesChunk1,
  ...letterTemplatesChunk2,
  ...letterTemplatesChunk3
];

export { getTemplateById } from '../../../data/letterTemplates';