// ============================================================
// C:\Dev\reelzfactory\apps\web\types\pipeline.ts
// 파이프라인 전체 타입 정의 — Single Source of Truth
// ============================================================

// ===== Pipeline Step =====
export type Step = "script" | "tts" | "storyboard" | "render" | "upload";
export type StepStatus = "pending" | "running" | "done" | "error";
export type ProjectStatus =
  | "draft"
  | "scripting"
  | "tts"
  | "imaging"
  | "rendering"
  | "uploading"
  | "completed"
  | "failed";

// ===== Scene =====
export interface Scene {
  id: number;
  sceneNumber: number;
  type: string;              // hook | situation | promise | core | twist | cta
  section?: string;          // 레거시 호환 (= type과 동일 역할)
  narration: string;
  imagePrompt: string;
  duration: number;
  durationEstimate?: number; // 레거시 호환
  textOverlay?: string;
  subtitleEmphasis?: string[];
  transition?: string;
  ctaType?: string;
  hasPersonalTake?: boolean;
  emotionLevel?: number;       // 감정 강도 1~10 (Fish Audio 태그 매핑용)
  // 파이프라인 진행 중 채워지는 필드
  imageUrl?: string;
  audioUrl?: string;
  model?: string;            // TTS 모델 식별 (gemini / openai)
}

// ===== Generated Script =====
export interface ScriptMetadata {
  title: string;
  headline?: { line1: string; line2: string };
  description: string;
  tags: string[];
  hashtags?: string[];
  thumbnail?: { text: string; imagePrompt: string };
}

export interface GeneratedScript {
  title: string;
  description?: string;
  totalScenes: number;
  estimatedDuration?: string;
  scenes: Scene[];
  tags?: string[];
  thumbnailPrompt?: string;
  chapters?: { time: string; title: string }[];
  metadata?: ScriptMetadata;
}

// ===== Project — Core (생성 시 필수) =====
interface ProjectCore {
  id: string;
  title: string;
  topic: string;
  mode: "longform" | "shorts";
  source: "quick" | "benchmark" | "reference";
  category: string;
  language: string;
  status: ProjectStatus;
  createdAt: string;
}

// ===== Project — Extended (파이프라인 진행 중 채워짐) =====
interface ProjectExtended {
  niche?: string;
  benchmarkUrl?: string;
  perspective?: string;
  knowledgeUsed?: boolean;
  estimatedCost?: number;
  actualCost?: number;
  youtubeUrl?: string;
  pipelineCheckpoint?: PipelineCheckpoint;
  voice_preset_snapshot?: Record<string, any>;
  image_preset_snapshot?: Record<string, any>;
  subtitle_preset_snapshot?: Record<string, any>;
  render_preset_snapshot?: Record<string, any>;
}

// ===== 최종 Project 타입 =====
export type Project = ProjectCore & ProjectExtended;

// ===== Pipeline Checkpoint (오토파일럿 재개용) =====
export interface PipelineCheckpoint {
  projectId: string;
  currentPhase: Step | "idle" | "done" | "error";
  completedPhases: Step[];
  voiceResults: SceneResult[];
  imageResults: SceneResult[];
  renderStatus: "pending" | "done" | "failed";
  uploadStatus: "pending" | "done" | "failed";
  lastUpdated: string;
  errorLog: PipelineError[];
}

export interface SceneResult {
  sceneId: number;
  status: "pending" | "done" | "failed";
  retryCount: number;
  url?: string;          // imageUrl 또는 audioUrl
  error?: string;
}

export interface PipelineError {
  phase: Step;
  sceneId?: number;
  message: string;
  timestamp: string;
}

// ===== Pipeline Notification (텔레그램 연동 대비) =====
export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationType =
  | "image_failed"
  | "voice_failed"
  | "render_failed"
  | "upload_failed"
  | "pipeline_complete"
  | "token_expired";

export interface PipelineNotification {
  type: NotificationType;
  projectId: string;
  details: string;
  severity: NotificationSeverity;
}

// ===== Render Data =====
export interface RenderSceneData {
  words: any[];
  durationInFrames: number;
  imageUrl?: string;
  audioUrl?: string;
}

export interface RenderData {
  totalDuration: number;
  fps: number;
  scenes: RenderSceneData[];
}

// ===== Voice Config Types =====
export interface VoiceStyle {
  id: string;
  label: string;
  desc: string;
  maleVoice: string;
  femaleVoice: string;
  speed: number;
}

export interface VoiceOption {
  voiceName: string;
  label: string;
}

export interface VoiceInfo {
  name: string;
  desc: string;
  gender: "male" | "female";
}

// ===== Step Config =====
export interface StepConfig {
  key: Step;
  label: string;
  icon: string;
}
// ===== Voice Engine =====
export type VoiceEngine = "google" | "openai" | "clone";