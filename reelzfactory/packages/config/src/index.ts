import { supabaseAdmin } from '../../shared/src/db/supabase';
import type { ChannelConfig } from '../../shared/src/types/channel';
import type { ProviderConfig } from '../../shared/src/types/provider';

/**
 * DB에서 채널 설정 로드
 */
export async function loadChannelConfig(channelId: string): Promise<ChannelConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    language: data.language,
    platform: data.platform,
    character: data.character_config,
    style: data.style_config,
    subtitle: data.subtitle_config,
    production: data.production_config,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  } as ChannelConfig;
}

/**
 * DB에서 유저의 Provider 설정 로드
 */
export async function loadProviderConfig(userId: string): Promise<ProviderConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('provider_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data || data.length === 0) return null;

  const llmSetting = data.find((d) => d.provider_type === 'llm');
  const imageSetting = data.find((d) => d.provider_type === 'image');
  const ttsSetting = data.find((d) => d.provider_type === 'tts');

  return {
    llm: {
      active: 'openrouter',
      openrouter: {
        apiKeyEnv: llmSetting?.api_key_encrypted || '',
        scriptModel: 'anthropic/claude-sonnet-4.6',
        translateModel: 'deepseek/deepseek-chat-v3-0324',
        maxTokens: 4096,
      },
    },
    image: {
      active: 'replicate',
      replicate: {
        apiKeyEnv: imageSetting?.api_key_encrypted || '',
        model: 'black-forest-labs/flux-2-klein',
        maxParallel: 5,
        timeout: 30,
      },
      fal: { apiKeyEnv: '', model: '', maxParallel: 10 },
      localSd: { endpoint: '', model: '' },
    },
    tts: {
      active: 'google',
      google: {
        apiKeyEnv: ttsSetting?.api_key_encrypted || '',
        model: 'wavenet',
        voices: { ko: 'ko-KR-Wavenet-D', en: 'en-US-Neural2-J', ja: 'ja-JP-Wavenet-B' },
      },
      qwen3Local: {
        endpoint: 'http://127.0.0.1:5000',
        model: 'Qwen3-TTS-1.7B',
        voiceClone: true,
        referenceAudio: './assets/voices/david_clone.wav',
      },
      elevenlabs: { apiKeyEnv: '', voices: {} },
    },
  } as ProviderConfig;
}
