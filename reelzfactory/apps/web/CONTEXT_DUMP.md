===== REELZFACTORY CONTEXT DUMP =====
Date: 2026-03-20 23:24
Working Dir: C:\Users\ADMIN\OneDrive\Desktop\reelzfactory\apps\web
Status: SCRIPT GENERATION WORKING

===== COMPLETED =====
1. Knowledge API: /api/knowledge/[niche] - 200 OK
2. Script Generation: /api/generate-script - 200 OK (google/gemini-2.5-flash via OpenRouter)
3. UI: /create page with mode/source/category/niche/language selection
4. Knowledge Pack: Nutrilite loaded (Hooks:50, Facts:19, Compliance:OK, Char:nutrilite_bot_v1)
5. BOM removed from all 9 JSON knowledge assets
6. localStorage keys aligned (reelzfactory_settings / reelzfactory_projects)

===== KNOWN ISSUES (non-blocking) =====
- Next.js 15 params await warning on /api/knowledge/[niche] (works but shows warning)
- Multiple lockfile warning (root + apps/web)

===== NEXT TODO =====
1. "Next: Generate Images" pipeline (fal.ai integration, character assets, scene-by-scene generation)
2. Voice/TTS pipeline
3. Caption/subtitle generation
4. Video rendering (Remotion)
5. Upload to YouTube

===== KEY FILES =====

--- FILE: lib\knowledge.ts (3173 chars) ---
// ============================================================
// Knowledge Base Loader - 기존 pipeline/assets/knowledge 연동
// ============================================================

export interface KnowledgePack {
  niche: string;
  hooks: any[];
  scripts: any;
  compliance: any;
  character: any;
  factbase: any[];
}

// 로컬 assets에서 knowledge pack 로드
// 경로: packages/pipeline/assets/knowledge/{niche}/
export async function loadKnowledgePack(niche: string): Promise<KnowledgePack | null> {
  try {
    const basePath = `/api/knowledge/${niche}`;
    const res = await fetch(basePath);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Knowledge pack을 프롬프트에 주입할 텍스트로 변환
export function knowledgeToPromptText(pack: KnowledgePack): string {
  const sections: string[] = [];

  // 1. 허용 클레임
  if (pack.compliance?.allowed_claims) {
    sections.push(`[허용 표현]\n${pack.compliance.allowed_claims.map((c: any) => `- ${c.expression || c}`).join('\n')}`);
  }

  // 2. 훅 모음
  if (pack.hooks.length > 0) {
    const hookTexts = pack.hooks.flatMap((hookFile: any) => {
      if (Array.isArray(hookFile.hooks)) {
        return hookFile.hooks.slice(0, 5).map((h: any) => `- [${h.category || h.type}] ${h.hook_text || h.text || h.hook || h.name}`);
      }
      if (Array.isArray(hookFile.scenes)) {
        return hookFile.scenes.slice(0, 5).map((s: any) => `- [${s.category}] ${s.scene_idea || s.description}`);
      }
      if (Array.isArray(hookFile.frameworks)) {
        return hookFile.frameworks.slice(0, 3).map((f: any) => `- [${f.name}] ${f.hook_example || f.description}`);
      }
      return [];
    });
    if (hookTexts.length > 0) {
      sections.push(`[검증된 훅 모음]\n${hookTexts.join('\n')}`);
    }
  }

  // 3. 바이럴 구조
  if (pack.scripts?.structures) {
    const structures = pack.scripts.structures.slice(0, 3).map((s: any) =>
      `- ${s.id}: ${s.phases?.map((p: any) => p.phase).join(' → ') || s.description}`
    );
    sections.push(`[바이럴 구조 템플릿]\n${structures.join('\n')}`);
  }

  // 4. 캐릭터
  if (pack.character) {
    const char = pack.character;
    sections.push(`[캐릭터]\n이름: ${char.character_name || char.name}\n마스터 프롬프트: ${char.master_prompt || ''}\n스타일: ${char.style_suffix || ''}`);
  }

  // 5. 팩트베이스
  if (pack.factbase.length > 0) {
    const facts = pack.factbase.flatMap((fb: any) => {
      if (fb.ingredients) return fb.ingredients.slice(0, 5).map((i: any) => `- ${i.name}: ${i.key_benefit || i.description}`);
      if (fb.products) return fb.products.slice(0, 5).map((p: any) => `- ${p.name}: ${p.key_benefit || p.description}`);
      return [];
    });
    if (facts.length > 0) {
      sections.push(`[성분/제품 팩트]\n${facts.join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

// 사용 가능한 니치 목록
export function getAvailableNiches(): string[] {
  // 현재는 하드코딩, 나중에 API에서 동적 로드
  return ['nutrilite'];
}

// 니치별 캐릭터 목록
export function getCharactersForNiche(niche: string): string[] {
  const characterMap: Record<string, string[]> = {
    nutrilite: ['nutrilite_bot_v1', 'acerola_c_v1', 'cal_mag_d_v1', 'double_x_v1', 'omega3_marine_v1'],
  };
  return characterMap[niche] || [];
}

--- END: lib\knowledge.ts ---

--- FILE: lib\prompts.ts (6276 chars) ---
// ============================================================
// 프롬프트 시스템 - pipeline/src/script/prompts.ts에서 포팅
// 숏폼 + 롱폼 + 애니메이션 프롬프트를 웹 API에서 사용
// ============================================================

export type ScriptMode = "shorts" | "longform" | "animation";
export type ScriptSource = "quick" | "benchmark" | "reference";

export interface ScriptGenerationInput {
  topic: string;
  mode: ScriptMode;
  source: ScriptSource;
  language: string;
  category?: string;
  persona?: string;
  tone?: string;
  maxScenes?: number;
  knowledgeText?: string;  // knowledge pack -> 텍스트 변환된 것
  benchmarkData?: string;  // YouTube 분석 결과
  referenceScript?: string; // 레퍼런스 대본
}

// 모드별 시스템 프롬프트 선택
export function getSystemPrompt(mode: ScriptMode): string {
  switch (mode) {
    case "shorts":
      return SHORTS_SYSTEM;
    case "longform":
      return LONGFORM_SYSTEM;
    case "animation":
      return ANIMATION_SYSTEM;
    default:
      return SHORTS_SYSTEM;
  }
}

// 유저 프롬프트 빌드
export function buildUserPrompt(input: ScriptGenerationInput): string {
  const parts: string[] = [];

  parts.push(`주제: ${input.topic}`);
  parts.push(`모드: ${input.mode === "shorts" ? "YouTube Shorts (25-45초)" : input.mode === "longform" ? "롱폼 (15-20분)" : "애니메이션 숏폼 (30-60초)"}`);
  parts.push(`언어: ${input.language}`);

  if (input.category) parts.push(`카테고리: ${input.category}`);
  if (input.persona) parts.push(`페르소나: ${input.persona}`);
  if (input.tone) parts.push(`톤: ${input.tone}`);
  if (input.maxScenes) parts.push(`최대 씬 수: ${input.maxScenes}`);

  // Knowledge Base 주입 (핵심!)
  if (input.knowledgeText) {
    parts.push(`\n${"=".repeat(50)}\n[Knowledge Base - 이 데이터를 반드시 활용하여 대본 작성]\n${"=".repeat(50)}\n${input.knowledgeText}`);
  }

  // 벤치마크 분석 결과 주입
  if (input.benchmarkData) {
    parts.push(`\n${"=".repeat(50)}\n[벤치마크 분석 - 이 영상의 구조/톤/전개를 참고하여 동일 스타일로 작성]\n${"=".repeat(50)}\n${input.benchmarkData}`);
  }

  // 레퍼런스 대본 주입
  if (input.referenceScript) {
    parts.push(`\n${"=".repeat(50)}\n[참고 자료 - 이 대본의 톤, 구조, 전개 방식을 분석하여 동일한 스타일로 작성하세요]\n${"=".repeat(50)}\n${input.referenceScript}`);
  }

  return parts.join("\n");
}

// ============================================================
// 숏폼 시스템 프롬프트 (기존 prompts.ts에서 가져옴)
// ============================================================
const SHORTS_SYSTEM = `너는 검증된 바이럴 구조를 복제-생산하는 글로벌 유튜브 쇼츠 스크립트 엔지니어다.

[핵심 원칙]
1-1. 피카소 이론 (모방 + 변형) - 검증된 100만뷰 영상의 형식을 가져오고 내용만 교체한다.
1-2. 목표 우선순위: CTR(첫 1초) 최대화 → 완주율 유지 → 댓글/공유/저장 자동 유발
1-3. 톤: Z세대 직설체, 빠른 템포, 보편 코미디 1개 허용. 혐오/비하/정치선동 절대 금지.
1-4. 크리에이터 사견 원칙: 5~7씬 중 반드시 1씬에 개인적 의견 또는 경험담 포함.

[훅 - 0초의 승부 (씬 1 필수)]
아래 5가지 중 반드시 1개 적용:
① 금지/위협 (손실 회피)
② 숫자/구체성 (=신뢰)
③ 의외성/언매치 (뇌 오류 유발)
④ 콜드오픈 (결과 먼저)
⑤ 권위 부여

[대본 구조 (5~7씬, 25~45초)]
씬 1 (훅) → 1~3초, 감정 폭발 문장
씬 2 (상황) → 캐릭터/문제 제시 + 권위 근거
씬 3 (약속) → "30초만 주세요"
씬 4-5 (핵심) → Claim → Proof → Limit + 사견 1곳
씬 6 (반전) → "그런데 진짜 문제는..." + 반박 해소
씬 7 (CTA) → 감정 트리거 CTA만 (직접 행동 요청 금지)

[감정 곡선 강제]
씬 1: 충격↑↑↑ → 씬 2: 하강↓ → 씬 3: 기대↑ → 씬 4-5: 정보+미니충격↑↓↑ → 씬 6: 반전↑↑↑ → 씬 7: 미해결↑↑

[금기 사항]
① 인사/자기소개로 시작 금지
② 벤치마킹 없이 창작 금지
③ 기능 나열 금지 - 이득과 변화만
④ 완벽주의 금지 - 간결+임팩트
⑤ 겸손 떨기 금지
⑥ 전문용어 남발 금지 - 중학생 수준
⑦ 지루한 전개 금지

[감정 트리거 CTA (씬 7)]
직접 행동 요청(저장/공유/구독/댓글) 절대 금지.
CTA-A: 미완성 루프형 (자이가르닉)
CTA-B: 손실 점화형 (주변인 연상)
CTA-C: 정체성 도발형 (프레이밍)
CTA-D: 양자택일 분류형 (대표성 휴리스틱)

[카테고리별 톤]
건강: 치료/완치 금지, "도움이 될 수 있다" 톤
심리: 진단 단정 금지, "그럴 수 있다" 톤
투자: 확정 수익/매수 지시 금지, 가능성 톤
경제: 정치 편향 금지, 데이터 기반

[imagePrompt 규칙]
- 반드시 영어로 작성
- 기본: "whiteboard animation style, white background, simple clean illustration, black outlines"
- 캐릭터: [CHARACTER] 태그, 미등장: [NO_CHARACTER] 태그
- "full frame, centered composition, no cropping, no borders" 필수

[출력: JSON만, 설명 없이]
{
  "title": "영상 제목",
  "totalScenes": 숫자,
  "scenes": [
    {
      "id": 1,
      "type": "hook|situation|promise|core|core_personal|twist|twist_personal|cta",
      "text": "자막 텍스트",
      "imagePrompt": "[CHARACTER/NO_CHARACTER] English description...",
      "durationEstimate": 3.5,
      "subtitleEmphasis": ["강조단어"],
      "transition": "fade|slide|zoom_in|zoom_out|cut",
      "ctaType": "A|B|C|D (씬 7에만)",
      "hasPersonalTake": false
    }
  ],
  "metadata": {
    "title": "업로드용 제목 (이모지, 50자 이내)",
    "headline": { "line1": "강조 키워드 (4~8글자)", "line2": "본제목 (6~12글자)" },
    "description": "SEO 설명 5~7줄",
    "tags": ["태그1", "태그2", "...최소 10개"],
    "hashtags": ["#해시태그1", "...최소 5개"],
    "thumbnail": { "text": "3~6단어", "imagePrompt": "English dramatic thumbnail description" }
  }
}`;

// ============================================================
// 롱폼 시스템 프롬프트 (축약 버전 - 핵심 구조만)
// ============================================================
const LONGFORM_SYSTEM = `너는 검증된 바이럴 롱폼 구조를 복제-생산하는 글로벌 유튜브 스크립트 엔지니어다.

[절대 규칙]
- 0초에 사건/결과로 시작. 인사 금지.
- 중학생 단어로 설명. 전문용어는 즉시 비유로 번역.
- 면책/안전착지 문장 완전 삭제. 가능성형 톤으로 대체.
- 크리에이터 사견 Part 2~4 중 2곳에 필수 삽입.

[강제 구조 (15~20분, 60~80씬)]
오프닝 0:00~0:45: 콜드오픈 → 캐릭터 → 스테이크 → 딜
Part 1~5: 각 Part = 핵심주장 + 비유 + 루프/반전/반박제거 + Claim→Proof→Limit + 미니결론 + 다음Part 떡밥
리텐션 인터럽트: 60~90초마다 (퀴즈/그래프/코미디)
리캡+리셋: 7분, 13분 지점
엔딩 60~90초: 결론 반복 + 정체성 마무리 + 감정 트리거 CTA 복합 (A+B+C+D+E)

[CTA 유형]
CTA-A: 미완성 루프 → 댓글+다음영상
CTA-B: 손실 점화 → 공유
CTA-C: 정체성 도발 → 저장+행동변화
CTA-D: 양자택일 → 댓글
CTA-E: 예고편 → 세션+구독

[출력: JSON만]
titles 10개 (호기심5+SEO5), thumbnails 6개, timeline, interruptSchedule, scriptVersionA, scriptVersionB, retentionDebug, culturalReview, qaScore, metadata, commentBait 포함.`;

// ============================================================
// 애니메이션 숏폼 시스템 프롬프트 (뉴트리봇 등)
// ============================================================
const ANIMATION_SYSTEM = `너는 건강기능식품 바이럴 숏폼 전문 스크립트 엔진이다.
귀여운 캐릭터 애니메이션 + 인지 부조화 음성 전략으로 40-60대를 타겟한다.
감으로 창작하지 않는다. 제공된 knowledge_base(팩트, 성분, 허용표현, 후킹)만 사용한다.

[컴플라이언스]
- claims.json 허용 표현만 사용
- 질병 치료/기적/의사 추천 등 금지 표현 절대 금지
- 가능성형 톤: "도움이 될 수 있다", "알려져 있다"

[씬 설계]
- 15초: 5씬 / 30초: 10씬 / 45초: 13씬 / 60초: 17씬
- render_type: lipsync(첫씬+마지막씬), action(핵심전환), image_motion(설명/통계)
- PAS 구조: HOOK 15% → AGITATE 25% → SOLUTION 35% → PROOF 15% → CTA 10%

[출력: JSON]
{ "title", "hook_text", "duration_target", "tone", "structure", "total_scenes", "scenes": [{ "scene_number", "phase", "render_type", "duration_sec", "tts_script", "tts_emotion_tag", "image_prompt", "video_prompt", "motion_type", "scene_note" }], "tags", "cta_text", "estimated_cost" }`;

--- END: lib\prompts.ts ---

--- FILE: lib\store.ts (2839 chars) ---
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
--- END: lib\store.ts ---

--- FILE: app\api\knowledge\[niche]\route.ts (2239 chars) ---
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function safeJsonParse(filePath: string) {
  let raw = fs.readFileSync(filePath, "utf-8");
  // BOM 제거
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  // 보이지 않는 제어 문자 제거
  raw = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return JSON.parse(raw);
}

function loadJsonFiles(dirPath: string): any[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((f: string) => f.endsWith(".json"))
    .map((f: string) => {
      try {
        return safeJsonParse(path.join(dirPath, f));
      } catch (e) {
        console.error(`Failed to parse ${f}:`, e);
        return null;
      }
    })
    .filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { niche: string } }
) {
  try {
    const niche = params.niche;
    
    // packages/pipeline/assets/knowledge/{niche} 경로
    const basePath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "packages",
      "pipeline",
      "assets",
      "knowledge",
      niche
    );

    if (!fs.existsSync(basePath)) {
      return NextResponse.json(
        { error: `Knowledge pack '${niche}' not found`, path: basePath },
        { status: 404 }
      );
    }

    const hooks = loadJsonFiles(path.join(basePath, "hooks"));
    const scripts = loadJsonFiles(path.join(basePath, "scripts"));
    const compliance = loadJsonFiles(path.join(basePath, "compliance"));
    const character = loadJsonFiles(path.join(basePath, "character"));
    const factbase = loadJsonFiles(path.join(basePath, "factbase"));

    return NextResponse.json({
      niche,
      hooks,
      scripts,
      compliance,
      character,
      factbase,
      summary: {
        hookCount: hooks.length,
        scriptCount: scripts.length,
        complianceCount: compliance.length,
        characterCount: character.length,
        factbaseCount: factbase.length,
      },
    });
  } catch (error: any) {
    console.error("Knowledge API error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack?.split("\n").slice(0, 3) },
      { status: 500 }
    );
  }
}
--- END: app\api\knowledge\[niche]\route.ts ---

--- FILE: app\api\generate-script\route.ts (5953 chars) ---
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import type { ScriptMode, ScriptSource } from "@/lib/prompts";
import { knowledgeToPromptText } from "@/lib/knowledge";
import * as fs from "fs";
import * as path from "path";

function loadKnowledgePackServer(niche: string) {
  const assetsBase = path.resolve(process.cwd(), "../../packages/pipeline/assets");
  const knowledgePath = path.join(assetsBase, "knowledge", niche);
  if (!fs.existsSync(knowledgePath)) return null;

  const pack: any = { niche, hooks: [], scripts: null, compliance: null, character: null, factbase: [] };

  const dirs = [
    { name: "hooks", handler: (dir: string) => {
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
        pack.hooks.push({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) });
      }
    }},
    { name: "scripts", handler: (dir: string) => {
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
      if (files.length > 0) {
        const target = files.find(f => f.includes("viral")) || files[0];
        pack.scripts = JSON.parse(fs.readFileSync(path.join(dir, target), "utf-8"));
      }
    }},
    { name: "compliance", handler: (dir: string) => {
      const cf = path.join(dir, "claims.json");
      if (fs.existsSync(cf)) pack.compliance = JSON.parse(fs.readFileSync(cf, "utf-8"));
    }},
    { name: "character", handler: (dir: string) => {
      const cf = fs.readdirSync(dir).find(f => f.endsWith(".json"));
      if (cf) pack.character = JSON.parse(fs.readFileSync(path.join(dir, cf), "utf-8"));
    }},
    { name: "factbase", handler: (dir: string) => {
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
        pack.factbase.push({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) });
      }
    }},
  ];

  for (const d of dirs) {
    const dirPath = path.join(knowledgePath, d.name);
    if (fs.existsSync(dirPath)) d.handler(dirPath);
  }
  return pack;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      mode = "shorts" as ScriptMode,
      source = "quick" as ScriptSource,
      language = "ko",
      category,
      persona,
      tone,
      maxScenes,
      niche,
      benchmarkUrl,
      apiKey,
    } = body;

    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), { status: 400 });
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenRouter API key is required" }), { status: 400 });
    }

    // 1. Knowledge Pack ?? (niche? ???)
    let knowledgeText = "";
    if (niche) {
      const pack = loadKnowledgePackServer(niche);
      if (pack) {
        knowledgeText = knowledgeToPromptText(pack);
        console.log("[Knowledge] Loaded pack for:", niche, "- Text length:", knowledgeText.length);
      }
    }

    // 2. ??? ???? ??
    const systemPrompt = getSystemPrompt(mode);

    // 3. ?? ???? ??
    const userPrompt = buildUserPrompt({
      topic,
      mode,
      source,
      language,
      category,
      persona,
      tone,
      maxScenes,
      knowledgeText: knowledgeText || undefined,
    });

    // 4. OpenRouter API ?? (SSE ????)
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    const stream = await client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: mode === "longform" ? 16000 : 4000,
    });

    // 5. SSE ??? ??
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "chunk", content }) + "\n\n"));
            }
          }

          // ???? ?? ? JSON ?? ??
          try {
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "complete",
                script: parsed,
                knowledgeUsed: !!knowledgeText,
                niche: niche || null,
                mode,
                source,
              }) + "\n\n"));
            } else {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "error",
                error: "Failed to parse JSON from response",
                rawText: fullText.substring(0, 500),
              }) + "\n\n"));
            }
          } catch (parseErr: any) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify({
              type: "error",
              error: "JSON parse error: " + parseErr.message,
              rawText: fullText.substring(0, 500),
            }) + "\n\n"));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "error", error: err.message }) + "\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

--- END: app\api\generate-script\route.ts ---

--- FILE: app\create\page.tsx (11343 chars) ---
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("shorts");
  const [source, setSource] = useState("quick");
  const [niche, setNiche] = useState("");
  const [category, setCategory] = useState("health");
  const [language, setLanguage] = useState("ko");
  const [knowledgeStatus, setKnowledgeStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [script, setScript] = useState(null);
  const [error, setError] = useState("");

  const categories = [
    { id: "health", label: "Health" },
    { id: "psychology", label: "Psychology" },
    { id: "invest", label: "Investment" },
    { id: "economy", label: "Economy" },
    { id: "ai_trend", label: "AI/Tech" },
    { id: "old_tales", label: "Stories" },
    { id: "shopping_health", label: "Shop-Health" },
    { id: "shopping_beauty", label: "Shop-Beauty" },
  ];

  const nicheOptions = [
    { id: "", label: "None (General)" },
    { id: "nutrilite", label: "Nutrilite" },
  ];

  useEffect(() => {
    if (niche) {
      setKnowledgeStatus("Loading...");
      fetch("/api/knowledge/" + niche)
        .then((res) => { if (res.ok) return res.json(); throw new Error("fail"); })
        .then((data) => {
          const hc = (data.hooks || []).reduce((s: number, h: any) => s + (h.hooks?.length || h.scenes?.length || h.frameworks?.length || 0), 0);
          const fc = (data.factbase || []).reduce((s, f) => s + (f.ingredients?.length || f.products?.length || 0), 0);
          const ch = data.character?.length > 0 ? (data.character[0].character_name || data.character[0].name || "Unknown") : "None";
          setKnowledgeStatus("Hooks: " + hc + " / Facts: " + fc + " / Compliance: " + (data.compliance ? "OK" : "N/A") + " / Char: " + ch);
        })
        .catch(() => setKnowledgeStatus("Knowledge pack not found"));
    } else {
      setKnowledgeStatus("");
    }
  }, [niche]);

  const handleGenerate = async () => {
    if (!topic.trim()) { setError("Enter a topic"); return; }
    const settings = JSON.parse(localStorage.getItem("reelzfactory_settings") || "{}");
    const apiKey = settings.apiKeys?.openrouter;
    if (!apiKey) { setError("Set OpenRouter API key in Settings"); return; }

    setIsGenerating(true); setStreamText(""); setScript(null); setError("");

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), mode, source, language, category, niche: niche || undefined, apiKey }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "API error"); }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.type === "chunk") setStreamText((prev) => prev + p.content);
            else if (p.type === "complete") {
              setScript(p.script);
              const projects = JSON.parse(localStorage.getItem("reelzfactory_projects") || "[]");
              projects.unshift({ id: Date.now().toString(), topic, mode, source, niche, category, script: p.script, knowledgeUsed: p.knowledgeUsed, createdAt: new Date().toISOString(), status: "script_done" });
              localStorage.setItem("reelzfactory_projects", JSON.stringify(projects));
            } else if (p.type === "error") setError(p.error);
          } catch {}
        }
      }
    } catch (err) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  const S = { card: { padding: "12px", background: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }, label: { display: "block", marginBottom: "6px", color: "#94a3b8", fontSize: "14px" }, select: { width: "100%", padding: "10px", background: "#111827", border: "1px solid #1e293b", borderRadius: "8px", color: "#fff" } };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", color: "#fff" }}>New Video</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={S.label}>Topic</label>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 3 secrets for vascular health in your 40s" rows={3} style={{ ...S.select, resize: "vertical" }} />
          </div>

          <div>
            <label style={S.label}>Mode</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["shorts","Shorts (25-45s)"],["longform","Longform (15-20m)"],["animation","Animation"]].map(([id,lb]) => (
                <button key={id} onClick={() => setMode(id)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"1px solid", borderColor: mode===id?"#2563eb":"#1e293b", background: mode===id?"#1e3a5f":"#111827", color: mode===id?"#60a5fa":"#94a3b8", cursor:"pointer", fontSize:"13px" }}>{lb}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={S.label}>Source</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["quick","Quick (AI Only)"],["benchmark","Benchmark"],["reference","Reference"]].map(([id,lb]) => (
                <button key={id} onClick={() => setSource(id)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"1px solid", borderColor: source===id?"#2563eb":"#1e293b", background: source===id?"#1e3a5f":"#111827", color: source===id?"#60a5fa":"#94a3b8", cursor:"pointer", fontSize:"13px" }}>{lb}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={S.label}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.select}>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
          </div>

          <div>
            <label style={S.label}>Knowledge Pack {niche && <span style={{ marginLeft:"8px", color:"#10b981", fontSize:"12px" }}>Active</span>}</label>
            <select value={niche} onChange={(e) => setNiche(e.target.value)} style={S.select}>
              {nicheOptions.map((n) => (<option key={n.id} value={n.id}>{n.label}</option>))}
            </select>
            {knowledgeStatus && (<div style={{ marginTop:"6px", padding:"8px 12px", background:"#0f172a", borderRadius:"6px", fontSize:"12px", color:"#10b981", border:"1px solid #1e293b" }}>{knowledgeStatus}</div>)}
          </div>

          <div>
            <label style={S.label}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={S.select}>
              {[["ko","Korean"],["en","English"],["pt","Portuguese"],["es","Spanish"],["ja","Japanese"]].map(([v,l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating || !topic.trim()} style={{ padding:"14px", borderRadius:"8px", border:"none", background: isGenerating?"#1e293b":"#2563eb", color:"#fff", fontWeight:"bold", fontSize:"16px", cursor: isGenerating?"not-allowed":"pointer", marginTop:"8px" }}>
            {isGenerating ? "Generating..." : "Generate Script"}
          </button>

          {error && (<div style={{ padding:"12px", background:"#450a0a", border:"1px solid #ef4444", borderRadius:"8px", color:"#fca5a5", fontSize:"14px" }}>{error}</div>)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(isGenerating || streamText) && (
            <div>
              <label style={S.label}>{isGenerating ? "Generating..." : "Complete"}</label>
              <div style={{ padding:"16px", background:"#0f172a", border:"1px solid #1e293b", borderRadius:"8px", maxHeight:"300px", overflow:"auto", fontSize:"12px", color:"#e2e8f0", fontFamily:"monospace", whiteSpace:"pre-wrap", lineHeight:"1.6" }}>{streamText || "Waiting..."}</div>
            </div>
          )}

          {script && (
            <div>
              <label style={S.label}>Script Result - {script.totalScenes || script.total_scenes || script.scenes?.length || 0} scenes</label>
              <div style={{ ...S.card, marginBottom:"12px" }}>
                <div style={{ fontSize:"16px", fontWeight:"bold", color:"#fff" }}>{script.title || script.metadata?.title || "Untitled"}</div>
                {script.metadata?.tags && (<div style={{ marginTop:"8px", display:"flex", flexWrap:"wrap", gap:"4px" }}>{script.metadata.tags.slice(0,8).map((t,i) => (<span key={i} style={{ padding:"2px 8px", background:"#1e293b", borderRadius:"12px", fontSize:"11px", color:"#94a3b8" }}>{t}</span>))}</div>)}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"400px", overflow:"auto" }}>
                {script.scenes?.map((sc,i) => (
                  <div key={i} style={S.card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                      <span style={{ fontSize:"12px", color:"#60a5fa", fontWeight:"bold" }}>Scene {sc.id || sc.scene_number || i+1} - {sc.type || sc.phase}</span>
                      <span style={{ fontSize:"11px", color:"#64748b" }}>{sc.durationEstimate || sc.duration_sec}s</span>
                    </div>
                    <div style={{ fontSize:"13px", color:"#e2e8f0", lineHeight:"1.5" }}>{sc.text || sc.tts_script}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { const p = JSON.parse(localStorage.getItem("reelzfactory_projects") || "[]"); if (p.length > 0) router.push("/create/" + p[0].id); }} style={{ marginTop:"16px", padding:"12px", width:"100%", borderRadius:"8px", border:"none", background:"#10b981", color:"#fff", fontWeight:"bold", cursor:"pointer", fontSize:"14px" }}>Next: Generate Images</button>
            </div>
          )}

          {!isGenerating && !streamText && !script && (
            <div style={{ padding:"40px", background:"#0f172a", borderRadius:"12px", border:"1px dashed #1e293b", textAlign:"center", color:"#64748b" }}>
              <div style={{ fontSize:"48px", marginBottom:"12px" }}>Video</div>
              <div style={{ fontSize:"16px", marginBottom:"8px" }}>Script will appear here</div>
              <div style={{ fontSize:"13px" }}>{niche ? "Knowledge Pack (" + niche + ") active" : "Quick mode - AI general knowledge"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
--- END: app\create\page.tsx ---

--- FILE: app\settings\page.tsx (4402 chars) ---
"use client";

import { useEffect, useState } from "react";
import { getSettings, saveSettings, saveAPIKeys, type APIKeys, type ChannelProfile } from "@/lib/store";

const inp: React.CSSProperties = {
  width: "100%", background: "#0a0a0a", border: "1px solid #1e293b",
  borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#fff", outline: "none",
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<APIKeys>({});
  const [ch, setCh] = useState<ChannelProfile>({ name: "", niche: "", language: "ko", tone: "professional", colorPalette: [], introStyle: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => { const s = getSettings(); setKeys(s.apiKeys); setCh(s.channel); }, []);

  const save = () => {
    saveAPIKeys(keys);
    saveSettings({ channel: ch });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields: { k: keyof APIKeys; l: string; p: string; req?: boolean }[] = [
    { k: "openrouter", l: "OpenRouter (Script AI)", p: "sk-or-v1-...", req: true },
    { k: "falai", l: "fal.ai (Image & Video)", p: "fal-..." },
    { k: "fishaudio", l: "Fish Audio (Voice Clone)", p: "fa-..." },
    { k: "elevenlabs", l: "ElevenLabs (Premium Voice)", p: "el-..." },
    { k: "youtube", l: "YouTube Data API", p: "AIza..." },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }} className="animate-fadeIn">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 32 }}>API keys are stored locally in your browser.</p>

      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 16 }}>API Keys</h2>
        {fields.map((f) => (
          <div key={f.k} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
              {f.l} {f.req && <span style={{ color: "#ef4444" }}>*</span>}
            </label>
            <input type="password" value={keys[f.k] || ""} onChange={(e) => setKeys({ ...keys, [f.k]: e.target.value })} placeholder={f.p} style={inp} />
          </div>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Channel Profile</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Channel Name</label>
          <input type="text" value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value })} style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Niche</label>
            <select value={ch.niche} onChange={(e) => setCh({ ...ch, niche: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
              <option value="">Select</option>
              <option value="health">Health</option>
              <option value="finance">Finance</option>
              <option value="tech">Tech</option>
              <option value="selfdev">Self Dev</option>
              <option value="food">Food</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Language</label>
            <select value={ch.language} onChange={(e) => setCh({ ...ch, language: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
              <option value="ko">Korean</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={save} style={{
        width: "100%", padding: "12px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
        border: "none", cursor: "pointer", color: "#fff",
        background: saved ? "#10b981" : "#2563eb",
      }}>{saved ? "Saved!" : "Save Settings"}</button>
    </div>
  );
}
--- END: app\settings\page.tsx ---

===== PIPELINE ASSETS STRUCTURE =====
nutrilite
nutrilite\character
nutrilite\compliance
nutrilite\factbase
nutrilite\hooks
nutrilite\scripts
nutrilite\character\character_config.json
nutrilite\compliance\claims.json
nutrilite\factbase\ingredients.json
nutrilite\factbase\products.json
nutrilite\hooks\facttack_trainer.json
nutrilite\hooks\general_health.json
nutrilite\hooks\nutrilite_brand.json
nutrilite\scripts\billionaire_frameworks.json
nutrilite\scripts\viral_structures.json

===== PIPELINE SRC STRUCTURE =====
animation
benchmark
caption
image
render
script
shopping
upload
utils
voice
fullPipeline.ts
testLongform.ts
animation\animationPipeline.ts
animation\generateAnimationScript.ts
animation\generateKlingVideo.ts
animation\index.ts
animation\test.ts
animation\testLipSync.ts
animation\testWav2Lip.ts
animation\testWav2LipHuman.ts
benchmark\analyzeStructure.ts
benchmark\extractVideo.ts
benchmark\index.ts
benchmark\overlayVideo.ts
caption\generateCaption.ts
caption\generateSceneCaptions.ts
caption\index.ts
image\generateImage.ts
image\generateSceneImages.ts
image\index.ts
render\index.ts
render\renderVideo.ts
script\generateScript.ts
script\index.ts
script\prompts.ts
script\translateScript.ts
shopping\references
shopping\analyzeProduct.ts
shopping\generateShoppingScript.ts
shopping\generateVideo.ts
shopping\shoppingPipeline.ts
shopping\references\hooks_en.txt
shopping\references\hooks_ko.txt
shopping\references\hooks_pt.txt
shopping\references\sample_scripts.txt
shopping\references\video_prompts.txt
upload\index.ts
upload\uploadYoutube.ts
utils\cleanup.ts
voice\generateSceneVoices.ts
voice\generateVoice.ts
voice\index.ts
voice\ttsStylePrompts.ts
voice\voice_config.json

===== UPDATE 2026-03-21 00:00 =====
NEW COMPLETED:
7. Image Generation API: /api/generate-images - 200 OK (fal.ai flux-2-pro)
8. Image Generation UI: /create/[id] page updated with image grid
9. Data Persistence: script + imageUrls saved to localStorage (reelzfactory_script_{id})
10. 7/7 images generated successfully for test project (141s total)

NEW FILES:
- app/api/generate-images/route.ts (5513 bytes)
- app/create/[id]/page.tsx UPDATED (imageUrl, generateImages, persistence)

NEXT TODO:
1. Voice/TTS pipeline (Fish Audio or ElevenLabs)
2. Caption/subtitle generation  
3. Video rendering (Remotion)
4. YouTube upload
---
## UPDATE 2026-03-21 00:57

### COMPLETED
- [x] Knowledge API (/api/knowledge/[niche]) - 200 OK
- [x] Script Generation (/api/generate-script) - 200 OK  
- [x] Image Generation (/api/generate-images) - 7/7 success, fal.ai flux-2-pro
- [x] TTS API route created (/api/generate-voice) - Gemini 2.5 Flash TTS
- [x] UI: create, create/[id], projects, settings pages
- [x] localStorage persistence (script + imageUrl + audioBase64)
- [x] BOM removed from 9 JSON files
- [x] Gemini API enabled in Google Cloud Console

### CURRENT BLOCKER
- TTS test pending (Gemini API just enabled, not yet tested)
- Need to verify: http://localhost:3000/create/1774063028781

### NEXT TODO (in order)
1. Test TTS (Generate All Voices)
2. Render pipeline (Remotion)
3. Caption/subtitle generation
4. YouTube upload

### KEY FILES
- lib/store.ts, lib/knowledge.ts, lib/prompts.ts
- app/api/knowledge/[niche]/route.ts
- app/api/generate-script/route.ts  
- app/api/generate-images/route.ts
- app/api/generate-voice/route.ts
- app/create/page.tsx
- app/create/[id]/page.tsx
- app/settings/page.tsx
- app/projects/page.tsx
- packages/pipeline/assets/knowledge/nutrilite/
- packages/pipeline/assets/characters/
