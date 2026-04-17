export interface LLMProvider {
  active: 'openrouter';
  openrouter: {
    apiKeyEnv: string;
    scriptModel: string;
    translateModel: string;
    maxTokens: number;
  };
}

export interface ImageProvider {
  active: 'replicate' | 'fal' | 'local_sd';
  replicate: {
    apiKeyEnv: string;
    model: string;
    maxParallel: number;
    timeout: number;
  };
  fal: {
    apiKeyEnv: string;
    model: string;
    maxParallel: number;
  };
  localSd: {
    endpoint: string;
    model: string;
  };
}

export interface TTSProvider {
  active: 'google' | 'qwen3_local' | 'elevenlabs';
  google: {
    apiKeyEnv: string;
    model: string;
    voices: Record<string, string>;
  };
  qwen3Local: {
    endpoint: string;
    model: string;
    voiceClone: boolean;
    referenceAudio: string;
  };
  elevenlabs: {
    apiKeyEnv: string;
    voices: Record<string, string>;
  };
}

export interface ProviderConfig {
  llm: LLMProvider;
  image: ImageProvider;
  tts: TTSProvider;
}
