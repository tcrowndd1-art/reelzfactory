// lib/store.ts — Supabase 기반 상태 관리 (localStorage 마이그레이션 포함)
import { supabase } from "./supabase";

// ============================================================
// Types
// ============================================================
export interface ChannelProfile {
  id?: string;
  name: string;
  niche: string;
  language: string;
  platform?: string;
  category?: string;
  voice_preset: Record<string, any>;
  image_preset: Record<string, any>;
  subtitle_preset: Record<string, any>;
  render_preset: Record<string, any>;
  script_preset: Record<string, any>;
  youtube_channel_id?: string;
  youtube_refresh_token?: string;
  knowledge_pack_id?: string;
}

export interface Project {
  id: string;
  channel_id?: string;
  title: string;
  topic: string;
  mode: "longform" | "shorts";
  source: "quick" | "benchmark" | "reference";
  category: string;
  language: string;
  status: string;
  script?: any;
  voice_preset_snapshot?: Record<string, any>;
  image_preset_snapshot?: Record<string, any>;
  subtitle_preset_snapshot?: Record<string, any>;
  render_preset_snapshot?: Record<string, any>;
  pipeline_checkpoint?: Record<string, any>;
  benchmark_url?: string;
  perspective?: string;
  estimated_cost?: number;
  actual_cost?: number;
  youtube_url?: string;
  created_at: string;
  updated_at?: string;
  // productions 테이블 추가 필드
  description?: string;
  tags?: string[];
  hashtags?: string[];
  video_path?: string;
  thumbnail_path?: string;
  youtube_video_id?: string;
  privacy_status?: string;
  cost_script?: number;
  cost_image?: number;
  cost_voice?: number;
  cost_total?: number;
  error_message?: string;
}

export interface APIKeys {
  openrouter?: string;
  falai?: string;
  fishaudio?: string;
  fishModelId?: string;
  youtube?: string;
  gemini?: string;
  openai?: string;
}

export interface UserSettings {
  apiKeys: APIKeys;
  channel: { name: string; niche: string; language: string; tone: string; image_preset?: Record<string, any>; subtitle_preset?: Record<string, any>; render_preset?: Record<string, any>; script_preset?: Record<string, any> };
  onboardingCompleted: boolean;
  preferredMode: "manual" | "autopilot";
  totalVideosCreated: number;
  totalSpent: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  apiKeys: {},
  channel: { name: "", niche: "", language: "ko", tone: "professional" },
  onboardingCompleted: false,
  preferredMode: "manual",
  totalVideosCreated: 0,
  totalSpent: 0,
};

export const DEFAULT_SCRIPT_PRESET = {
  shortsEngine: "auto" as const,
  longformEngine: "auto" as const,
  dataEngine: "auto" as const,
  customPrompt: "",        // 하위호환 유지
  instruction_a: "",       // A지침서: 역할+타겟+대본공식+페르소나
  knowledge_b: "",         // B지침서: Hook패턴+오디오+제목공식+전략심리
  validatorEnabled: true,
};

// ============================================================
// Settings (localStorage 유지 — API 키는 브라우저에만 저장)
// ============================================================
export function getSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("reelzfactory_settings");
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<UserSettings>): void {
  if (typeof window === "undefined") return;
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem("reelzfactory_settings", JSON.stringify(updated));
}

export function saveAPIKeys(keys: Partial<APIKeys>): void {
  const current = getSettings();
  saveSettings({ apiKeys: { ...current.apiKeys, ...keys } });
}

export function isOnboardingDone(): boolean {
  return getSettings().onboardingCompleted;
}

export function hasRequiredKeys(): boolean {
  const keys = getSettings().apiKeys;
  return !!keys.openrouter;
}

// ============================================================
// Channels (Supabase)
// ============================================================
export async function getChannels(): Promise<ChannelProfile[]> {
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("getChannels error:", error); return []; }
  return data || [];
}

export async function getChannel(id: string): Promise<ChannelProfile | null> {
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("getChannel error:", error); return null; }
  return data;
}

export async function saveChannel(channel: Partial<ChannelProfile>): Promise<ChannelProfile | null> {
  if (channel.id) {
    const { data, error } = await supabase
      .from("channels")
      .update(channel)
      .eq("id", channel.id)
      .select()
      .single();
    if (error) { console.error("updateChannel error:", error); return null; }
    return data;
  } else {
    const { data, error } = await supabase
      .from("channels")
      .insert(channel)
      .select()
      .single();
    if (error) { console.error("insertChannel error:", error); return null; }
    return data;
  }
}

export async function deleteChannel(id: string): Promise<boolean> {
  const { error } = await supabase.from("channels").delete().eq("id", id);
  if (error) { console.error("deleteChannel error:", error); return false; }
  return true;
}

// ============================================================
// Projects (Supabase — productions 테이블)
// ============================================================
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("productions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("getProjects error:", error); return []; }
  return (data || []).map(mapProductionToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("productions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("getProject error:", error); return null; }
  return data ? mapProductionToProject(data) : null;
}

export async function saveProject(project: Partial<Project>): Promise<Project | null> {
  const payload = mapProjectToProduction(project);

  const { data: existing } = await supabase
    .from("productions")
    .select("id")
    .eq("id", project.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("productions")
      .update(payload)
      .eq("id", project.id)
      .select()
      .single();
    if (error) { console.error("updateProject error:", error); return null; }
    return data ? mapProductionToProject(data) : null;
  } else {
    const { data, error } = await supabase
      .from("productions")
      .insert({ ...payload, id: project.id })
      .select()
      .single();
    if (error) { console.error("insertProject error:", error); return null; }
    return data ? mapProductionToProject(data) : null;
  }
}

// ============================================================
// Pipeline Logs (Supabase)
// ============================================================
export async function addPipelineLog(
  projectId: string,
  phase: string,
  severity: string,
  message: string,
  details?: Record<string, any>
): Promise<void> {
  const { error } = await supabase.from("pipeline_logs").insert({
    project_id: projectId,
    phase,
    severity,
    message,
    details,
  });
  if (error) console.error("addPipelineLog error:", error);
}

export async function getPipelineLogs(projectId: string) {
  const { data, error } = await supabase
    .from("pipeline_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { console.error("getPipelineLogs error:", error); return []; }
  return data || [];
}

// ============================================================
// Mapping helpers (productions ↔ Project)
// ============================================================
function mapProductionToProject(row: any): Project {
  return {
    id: row.id,
    channel_id: row.channel_id,
    title: row.title || "",
    topic: row.topic || "",
    mode: row.mode || "shorts",
    source: row.source || "quick",
    category: row.category || "health",
    language: row.language || "ko",
    status: row.status || "draft",
    script: row.script_raw || row.script,
    voice_preset_snapshot: row.voice_preset_snapshot,
    image_preset_snapshot: row.image_preset_snapshot,
    subtitle_preset_snapshot: row.subtitle_preset_snapshot,
    render_preset_snapshot: row.render_preset_snapshot,
    pipeline_checkpoint: row.pipeline_checkpoint,
    benchmark_url: row.benchmark_url,
    perspective: row.perspective,
    estimated_cost: row.cost_total,
    actual_cost: row.cost_total,
    cost_script: row.cost_script,
    cost_image: row.cost_image,
    cost_voice: row.cost_voice,
    cost_total: row.cost_total,
    youtube_url: row.youtube_url,
    youtube_video_id: row.youtube_video_id,
    description: row.description,
    tags: row.tags,
    hashtags: row.hashtags,
    video_path: row.video_path,
    thumbnail_path: row.thumbnail_path,
    privacy_status: row.privacy_status,
    error_message: row.error_message,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at,
  };
}

function mapProjectToProduction(project: Partial<Project>): Record<string, any> {
  const p: Record<string, any> = {};
  if (project.channel_id !== undefined) p.channel_id = project.channel_id;
  if (project.title !== undefined) p.title = project.title;
  if (project.topic !== undefined) p.topic = project.topic;
  if (project.mode !== undefined) p.mode = project.mode;
  if (project.source !== undefined) p.source = project.source;
  if (project.category !== undefined) p.category = project.category;
  if (project.language !== undefined) p.language = project.language;
  if (project.status !== undefined) p.status = project.status;
  if (project.script !== undefined) p.script_raw = project.script;
  if (project.voice_preset_snapshot !== undefined) p.voice_preset_snapshot = project.voice_preset_snapshot;
  if (project.image_preset_snapshot !== undefined) p.image_preset_snapshot = project.image_preset_snapshot;
  if (project.subtitle_preset_snapshot !== undefined) p.subtitle_preset_snapshot = project.subtitle_preset_snapshot;
  if (project.render_preset_snapshot !== undefined) p.render_preset_snapshot = project.render_preset_snapshot;
  if (project.pipeline_checkpoint !== undefined) p.pipeline_checkpoint = project.pipeline_checkpoint;
  if (project.benchmark_url !== undefined) p.benchmark_url = project.benchmark_url;
  if (project.perspective !== undefined) p.perspective = project.perspective;
  if (project.description !== undefined) p.description = project.description;
  if (project.tags !== undefined) p.tags = project.tags;
  if (project.hashtags !== undefined) p.hashtags = project.hashtags;
  if (project.youtube_url !== undefined) p.youtube_url = project.youtube_url;
  if (project.youtube_video_id !== undefined) p.youtube_video_id = project.youtube_video_id;
  if (project.video_path !== undefined) p.video_path = project.video_path;
  if (project.privacy_status !== undefined) p.privacy_status = project.privacy_status;
  if (project.cost_script !== undefined) p.cost_script = project.cost_script;
  if (project.cost_image !== undefined) p.cost_image = project.cost_image;
  if (project.cost_voice !== undefined) p.cost_voice = project.cost_voice;
  if (project.cost_total !== undefined) p.cost_total = project.cost_total;
  if (project.error_message !== undefined) p.error_message = project.error_message;
  return p;
}

// ============================================================
// localStorage → Supabase 1회 마이그레이션
// ============================================================
export async function migrateLocalToSupabase(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const migrated = localStorage.getItem("reelzfactory_migrated_to_supabase");
  if (migrated === "true") return 0;

  let count = 0;
  try {
    const stored = localStorage.getItem("reelzfactory_projects");
    if (stored) {
      const projects: any[] = JSON.parse(stored);
      for (const p of projects) {
        await saveProject({
          id: p.id,
          title: p.title || "",
          topic: p.topic || "",
          mode: p.mode || "shorts",
          source: p.scriptSource || p.source || "quick",
          category: p.category || "health",
          language: p.language || "ko",
          status: p.status || "draft",
          script: p.script,
          benchmark_url: p.benchmarkUrl,
          perspective: p.perspective,
          created_at: p.createdAt || new Date().toISOString(),
        });
        count++;
      }
    }
    localStorage.setItem("reelzfactory_migrated_to_supabase", "true");
    console.log(`Migrated ${count} projects to Supabase`);
  } catch (e) {
    console.error("Migration error:", e);
  }
  return count;
}
