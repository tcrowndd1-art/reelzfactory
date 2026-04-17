-- ============================================
-- ReelzFactory Database Schema
-- ============================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'pro')),
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. API 키 저장 테이블
CREATE TABLE provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('llm', 'image', 'tts', 'youtube')),
  provider_name TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  model_name TEXT,
  is_active BOOLEAN DEFAULT true,
  monthly_budget NUMERIC DEFAULT 100,
  current_usage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 채널 테이블
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'ko',
  platform TEXT DEFAULT 'youtube_shorts',
  character_config JSONB DEFAULT '{}',
  style_config JSONB DEFAULT '{}',
  subtitle_config JSONB DEFAULT '{}',
  production_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 음성 매핑 테이블
CREATE TABLE voice_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  provider_setting_id UUID REFERENCES provider_settings(id),
  language TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  is_cloned BOOLEAN DEFAULT false,
  reference_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 영상 제작 테이블
CREATE TABLE productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued', 'scripting', 'imaging', 'voicing',
    'captioning', 'rendering', 'uploading',
    'review', 'published', 'failed'
  )),
  script JSONB,
  video_url TEXT,
  youtube_video_id TEXT,
  youtube_url TEXT,
  metadata JSONB,
  cost_breakdown JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- 6. 장면 테이블
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES productions(id) ON DELETE CASCADE,
  scene_index INTEGER NOT NULL,
  scene_type TEXT CHECK (scene_type IN ('hook', 'content', 'twist', 'cta')),
  text TEXT NOT NULL,
  image_prompt TEXT,
  image_url TEXT,
  audio_url TEXT,
  audio_duration NUMERIC,
  subtitle_emphasis TEXT[],
  transition TEXT DEFAULT 'fade',
  words JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 분석 테이블
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES productions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  watch_time_seconds NUMERIC DEFAULT 0,
  click_through_rate NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 콘텐츠 벡터 (중복 방지 + 유사 검색)
CREATE TABLE content_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES productions(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  embedding vector(1536),
  score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_productions_user ON productions(user_id);
CREATE INDEX idx_productions_channel ON productions(channel_id);
CREATE INDEX idx_productions_status ON productions(status);
CREATE INDEX idx_scenes_production ON scenes(production_id);
CREATE INDEX idx_analytics_production ON analytics(production_id);
CREATE INDEX idx_content_vectors_embedding ON content_vectors
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
