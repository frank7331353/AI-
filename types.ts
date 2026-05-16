export type AspectRatio = '1:1' | '3:4';

export type StoryStyle = 'none' | 'pixar' | 'ghibli' | 'ue5';

export interface ReferenceImage {
  id: string;
  data: string; // Base64 string
  mimeType: string;
}

export interface GeneratedScene {
  id: string;
  prompt: string;
  imageUrl?: string;
  isLoading: boolean;
  error?: string;
  selected: boolean;
}

export interface GenerationConfig {
  promptText: string;
  aspectRatio: AspectRatio;
  referenceImages: ReferenceImage[];
  style: StoryStyle;
}