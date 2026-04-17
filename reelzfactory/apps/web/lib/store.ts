// lib/store.ts - LocalStorage-based state management for ReelzFactory

export interface ChannelProfile {
  name: string;
  niche: string;
  language: string;
  tone: string;
  colorPalette: string[];
  introStyle: string;
  signatureCharacter?: string;
}

export interface APIKeys {
  openrouter?: string;
  falai?: string;
  fishaudio?: string;
  youtube?: string;
  elevenlabs?: string;
  gemini?: string;
  openai?: string;
}

export interface UserSettings {
  apiKeys: APIKeys;
  channel: ChannelProfile;
  onboardingCompleted: boolean;
  preferredMode: "manual" | "autopilot";
  totalVideosCreated: number;
  totalSpent: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  apiKeys: {},
  channel: {
    name: "",
    niche: "",
    language: "ko",
    tone: "professional",
    colorPalette: ["#2563eb", "#10b981", "#f59e0b"],
    introStyle: "hook-question",
  },
  onboardingCompleted: false,
  preferredMode: "manual",
  totalVideosCreated: 0,
  totalSpent: 0,
};

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
  return !!(keys.openrouter);
}

export interface Project {
  id: string;
  title: string;
  topic: string;
  mode: "longform" | "shorts";
  scriptSource: "quick" | "benchmark" | "reference";
  status: "draft" | "scripting" | "imaging" | "tts" | "rendering" | "uploading" | "completed" | "failed";
  createdAt: string;
  estimatedCost: number;
  actualCost?: number;
  benchmarkUrl?: string;
  perspective?: string;
}

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("reelzfactory_projects");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.unshift(project);
  localStorage.setItem("reelzfactory_projects", JSON.stringify(projects));
}