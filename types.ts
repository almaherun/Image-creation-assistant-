export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface Scene {
  id: string;
  imagePrompt: string;
  animationPrompt: string;
  voiceoverPrompt: string; // Arabic
  imageUrl: string;
}

export interface Story {
  id: string;
  name: string;
  originalPrompt: string;
  scenes: Scene[];
  characters: Character[];
  aspectRatio: AspectRatio;
  videoDuration: number; // in seconds
  sceneDuration: number; // in seconds
}

export type AspectRatio = "1:1" | "16:9" | "9:16";

export interface SceneGenerationResult {
    imagePrompt: string;
    animationPrompt: string;
    voiceoverPrompt: string;
}

export interface AppBackup {
  characters: Character[];
  stories: Story[];
}
