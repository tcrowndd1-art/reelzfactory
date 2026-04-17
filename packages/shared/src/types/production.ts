export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface Scene {
  id: number;
  type: 'hook' | 'content' | 'twist' | 'cta';
  text: string;
  imagePrompt: string;
  imageUrl: string;
  audioDuration: number;
  subtitleEmphasis: string[];
  transition: string;
  words: WordTimestamp[];
}

export interface ScriptOutput {
  title: string;
  totalScenes: number;
  scenes: {
    id: number;
    type: 'hook' | 'content' | 'twist' | 'cta';
    text: string;
    imagePrompt: string;
    durationEstimate: number;
    subtitleEmphasis: string[];
    transition: string;
  }[];
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  };
}

export interface CostBreakdown {
  script: number;
  images: number;
  voice: number;
  total: number;
  currency: 'USD';
}

export interface Production {
  id: string;
  channelId: string;
  userId: string;
  topic: string;
  status:
    | 'queued'
    | 'scripting'
    | 'imaging'
    | 'voicing'
    | 'captioning'
    | 'rendering'
    | 'uploading'
    | 'review'
    | 'published'
    | 'failed';
  script: ScriptOutput | null;
  scenes: Scene[];
  videoUrl: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  } | null;
  costBreakdown: CostBreakdown | null;
  createdAt: Date;
  publishedAt: Date | null;
}
