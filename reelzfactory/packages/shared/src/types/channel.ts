export interface ChannelConfig {
  id: string;
  userId: string;
  name: string;
  language: 'ko' | 'en' | 'ja' | 'es' | 'pt' | 'zh' | 'de';
  platform: 'youtube_shorts' | 'tiktok' | 'instagram_reels';

  character: {
    name: string;
    avatarUrl: string;
    voiceId: string;
    voiceStyle: string;
    tone: string;
  };

  style: {
    prefix: string;
    aspectRatio: '9:16' | '16:9';
    resolution: '1080x1920' | '1920x1080';
  };

  subtitle: {
    font: string;
    size: number;
    color: string;
    highlightColor: string;
    position: 'bottom_center' | 'center' | 'top_center';
    animation: 'word_highlight' | 'word_bounce' | 'word_scale';
  };

  production: {
    bgm: {
      enabled: boolean;
      mood: string;
      volume: number;
      duckOnSpeech: boolean;
    };
    sfx: {
      onTransition: boolean;
      onEmphasis: boolean;
    };
    watermark: {
      enabled: boolean;
      imageUrl: string;
      position: string;
      opacity: number;
    };
    intro: {
      enabled: boolean;
      templateId: string;
    };
    outro: {
      enabled: boolean;
      templateId: string;
    };
    thumbnail: {
      autoGenerate: boolean;
      style: string;
    };
    abTest: {
      enabled: boolean;
      hookVariants: number;
      thumbnailVariants: number;
    };
    metadata: {
      autoTitle: boolean;
      autoDescription: boolean;
      autoTags: boolean;
      hashtagCount: number;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}
